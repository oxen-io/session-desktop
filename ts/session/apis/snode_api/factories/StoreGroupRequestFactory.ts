import { UserGroupsGet } from 'libsession_util_nodejs';
import { compact, isEmpty } from 'lodash';
import { SignalService } from '../../../../protobuf';
import { MetaGroupWrapperActions } from '../../../../webworker/workers/browser/libsession_worker_interface';
import { GroupUpdateInfoChangeMessage } from '../../../messages/outgoing/controlMessage/group_v2/to_group/GroupUpdateInfoChangeMessage';
import { GroupUpdateMemberChangeMessage } from '../../../messages/outgoing/controlMessage/group_v2/to_group/GroupUpdateMemberChangeMessage';
import { MessageWrapper } from '../../../sending/MessageWrapper';
import { ed25519Str } from '../../../utils/String';
import { PendingChangesForGroup } from '../../../utils/libsession/libsession_utils';
import {
  StoreGroupExtraData,
  StoreGroupInfoSubRequest,
  StoreGroupKeysSubRequest,
  StoreGroupMembersSubRequest,
  StoreGroupMessageSubRequest,
} from '../SnodeRequestTypes';
import { SnodeNamespaces } from '../namespaces';

export type StoreMessageToSubRequestType =
  | GroupUpdateMemberChangeMessage
  | GroupUpdateInfoChangeMessage;

async function makeGroupMessageSubRequest(
  updateMessages: Array<StoreMessageToSubRequestType | null>,
  group: Pick<UserGroupsGet, 'authData' | 'secretKey'>
) {
  const compactedMessages = compact(updateMessages);
  if (isEmpty(compactedMessages)) {
    return [];
  }
  const groupPk = compactedMessages[0].destination;
  const allForSameDestination = compactedMessages.every(m => m.destination === groupPk);
  if (!allForSameDestination) {
    throw new Error('makeGroupMessageSubRequest: not all messages are for the same destination');
  }

  const messagesToEncrypt: Array<StoreGroupExtraData> = compactedMessages.map(updateMessage => {
    const wrapped = MessageWrapper.wrapContentIntoEnvelope(
      SignalService.Envelope.Type.SESSION_MESSAGE,
      undefined,
      updateMessage.createAtNetworkTimestamp, // message is signed with this timestmap
      updateMessage.plainTextBuffer()
    );

    return {
      namespace: SnodeNamespaces.ClosedGroupMessages,
      pubkey: updateMessage.destination,
      ttl: updateMessage.ttl(),
      networkTimestamp: updateMessage.createAtNetworkTimestamp,
      data: SignalService.Envelope.encode(wrapped).finish(),
      dbMessageIdentifier: updateMessage.identifier,
    };
  });

  const encryptedContent = messagesToEncrypt.length
    ? await MetaGroupWrapperActions.encryptMessages(
        groupPk,
        messagesToEncrypt.map(m => m.data)
      )
    : [];
  if (encryptedContent.length !== messagesToEncrypt.length) {
    throw new Error(
      'makeGroupMessageSubRequest: MetaGroupWrapperActions.encryptMessages did not return the right count of items'
    );
  }

  const updateMessagesEncrypted = messagesToEncrypt.map((requestDetails, index) => ({
    ...requestDetails,
    data: encryptedContent[index],
  }));

  const updateMessagesRequests = updateMessagesEncrypted.map(m => {
    return new StoreGroupMessageSubRequest({
      encryptedData: m.data,
      groupPk,
      ttlMs: m.ttl,
      dbMessageIdentifier: m.dbMessageIdentifier,
      ...group,
      createdAtNetworkTimestamp: m.networkTimestamp,
    });
  });

  return updateMessagesRequests;
}

function makeStoreGroupKeysSubRequest({
  encryptedSupplementKeys,
  group,
}: {
  group: Pick<UserGroupsGet, 'secretKey' | 'pubkeyHex'>;
  encryptedSupplementKeys: Uint8Array | null;
}) {
  const groupPk = group.pubkeyHex;
  if (!encryptedSupplementKeys?.length) {
    return undefined;
  }

  // supplementalKeys are already encrypted, but we still need the secretKey to sign the request

  if (!group.secretKey || isEmpty(group.secretKey)) {
    window.log.debug(
      `pushChangesToGroupSwarmIfNeeded: ${ed25519Str(groupPk)}: keysEncryptedmessage not empty but we do not have the secretKey`
    );

    throw new Error(
      'pushChangesToGroupSwarmIfNeeded: keysEncryptedmessage not empty but we do not have the secretKey'
    );
  }
  return new StoreGroupKeysSubRequest({
    encryptedData: encryptedSupplementKeys,
    groupPk,
    secretKey: group.secretKey,
  });
}

function makeStoreGroupConfigSubRequest({
  group,
  pendingConfigData,
}: {
  group: Pick<UserGroupsGet, 'secretKey' | 'pubkeyHex'>;
  pendingConfigData: Array<PendingChangesForGroup>;
}) {
  if (!pendingConfigData.length) {
    return [];
  }
  const groupPk = group.pubkeyHex;

  if (!group.secretKey || isEmpty(group.secretKey)) {
    window.log.debug(
      `pushChangesToGroupSwarmIfNeeded: ${ed25519Str(groupPk)}: pendingConfigMsgs not empty but we do not have the secretKey`
    );

    throw new Error(
      'pushChangesToGroupSwarmIfNeeded: pendingConfigMsgs not empty but we do not have the secretKey'
    );
  }

  const groupInfoSubRequests = compact(
    pendingConfigData.map(m =>
      m.namespace === SnodeNamespaces.ClosedGroupInfo
        ? new StoreGroupInfoSubRequest({
            encryptedData: m.ciphertext,
            groupPk,
            secretKey: group.secretKey,
          })
        : null
    )
  );

  const groupMembersSubRequests = compact(
    pendingConfigData.map(m =>
      m.namespace === SnodeNamespaces.ClosedGroupMembers
        ? new StoreGroupMembersSubRequest({
            encryptedData: m.ciphertext,
            groupPk,
            secretKey: group.secretKey,
          })
        : null
    )
  );

  const groupKeysSubRequests = compact(
    pendingConfigData.map(m =>
      m.namespace === SnodeNamespaces.ClosedGroupKeys
        ? new StoreGroupKeysSubRequest({
            encryptedData: m.ciphertext,
            groupPk,
            secretKey: group.secretKey,
          })
        : null
    )
  );

  // we want to store first the keys (as the info and members might already be encrypted with them)
  return [...groupKeysSubRequests, ...groupInfoSubRequests, ...groupMembersSubRequests];
}

export const StoreGroupRequestFactory = {
  makeGroupMessageSubRequest,
  makeStoreGroupConfigSubRequest,
  makeStoreGroupKeysSubRequest,
};
