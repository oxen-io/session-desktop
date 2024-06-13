// REMOVE COMMENT AFTER: This can just export pure functions as it doesn't need state

import { AbortController } from 'abort-controller';
import { GroupPubkeyType, PubkeyType } from 'libsession_util_nodejs';
import { compact, isArray, isEmpty, isNumber, isString } from 'lodash';
import pRetry from 'p-retry';
import { Data, SeenMessageHashes } from '../../data/data';
import { SignalService } from '../../protobuf';
import { UserGroupsWrapperActions } from '../../webworker/workers/browser/libsession_worker_interface';
import { OpenGroupRequestCommonType } from '../apis/open_group_api/opengroupV2/ApiUtil';
import { OpenGroupMessageV2 } from '../apis/open_group_api/opengroupV2/OpenGroupMessageV2';
import {
  sendMessageOnionV4BlindedRequest,
  sendSogsMessageOnionV4,
} from '../apis/open_group_api/sogsv3/sogsV3SendMessage';
import {
  BuiltSnodeSubRequests,
  DeleteAllFromGroupMsgNodeSubRequest,
  DeleteHashesFromGroupNodeSubRequest,
  DeleteHashesFromUserNodeSubRequest,
  MethodBatchType,
  NotEmptyArrayOfBatchResults,
  RawSnodeSubRequests,
  StoreGroupInfoSubRequest,
  StoreGroupKeysSubRequest,
  StoreGroupMembersSubRequest,
  StoreGroupMessageSubRequest,
  StoreGroupRevokedRetrievableSubRequest,
  StoreLegacyGroupMessageSubRequest,
  StoreUserConfigSubRequest,
  StoreUserMessageSubRequest,
} from '../apis/snode_api/SnodeRequestTypes';
import { BatchRequests } from '../apis/snode_api/batchRequest';
import { GetNetworkTime } from '../apis/snode_api/getNetworkTime';
import { SnodeNamespace, SnodeNamespaces } from '../apis/snode_api/namespaces';
import {
  SigResultAdmin,
  SigResultSubAccount,
  SnodeGroupSignature,
} from '../apis/snode_api/signature/groupSignature';
import { SnodeSignature, SnodeSignatureResult } from '../apis/snode_api/signature/snodeSignatures';
import { SnodePool } from '../apis/snode_api/snodePool';
import { WithRevokeSubRequest } from '../apis/snode_api/types';
import { TTL_DEFAULT } from '../constants';
import { ConvoHub } from '../conversations';
import { addMessagePadding } from '../crypto/BufferPadding';
import { MessageEncrypter } from '../crypto/MessageEncrypter';
import { ContentMessage } from '../messages/outgoing';
import { UnsendMessage } from '../messages/outgoing/controlMessage/UnsendMessage';
import { ClosedGroupNewMessage } from '../messages/outgoing/controlMessage/group/ClosedGroupNewMessage';
import { GroupUpdateMemberLeftMessage } from '../messages/outgoing/controlMessage/group_v2/to_group/GroupUpdateMemberLeftMessage';
import { GroupUpdateMemberLeftNotificationMessage } from '../messages/outgoing/controlMessage/group_v2/to_group/GroupUpdateMemberLeftNotificationMessage';
import { OpenGroupVisibleMessage } from '../messages/outgoing/visibleMessage/OpenGroupVisibleMessage';
import { PubKey } from '../types';
import { OutgoingRawMessage } from '../types/RawMessage';
import { UserUtils } from '../utils';
import { ed25519Str, fromUInt8ArrayToBase64 } from '../utils/String';
import { MessageSentHandler } from './MessageSentHandler';
import { MessageWrapper } from './MessageWrapper';

// ================ SNODE STORE ================

function getMinRetryTimeout() {
  return 1000;
}

function isContentSyncMessage(message: ContentMessage) {
  if (
    message instanceof ClosedGroupNewMessage ||
    message instanceof UnsendMessage ||
    (message as any).syncTarget?.length > 0
  ) {
    return true;
  }
  return false;
}

type StoreRequest05 =
  | StoreUserConfigSubRequest
  | StoreUserMessageSubRequest
  | StoreLegacyGroupMessageSubRequest;
type StoreRequest03 =
  | StoreGroupInfoSubRequest
  | StoreGroupMembersSubRequest
  | StoreGroupKeysSubRequest
  | StoreGroupRevokedRetrievableSubRequest
  | StoreGroupMessageSubRequest;

type PubkeyToRequestType<T extends GroupPubkeyType | PubkeyType> = T extends PubkeyType
  ? StoreRequest05
  : StoreRequest03;

type StoreRequestsPerPubkey<T extends PubkeyType | GroupPubkeyType> = Array<PubkeyToRequestType<T>>;

type EncryptedMessageDetails = Pick<
  EncryptAndWrapMessageResults,
  | 'namespace'
  | 'encryptedAndWrappedData'
  | 'identifier'
  | 'ttl'
  | 'networkTimestamp'
  | 'plainTextBuffer'
>;

async function messageToRequest05({
  destination,
  encryptedAndWrapped: {
    namespace,
    encryptedAndWrappedData,
    identifier,
    ttl,
    networkTimestamp,
    plainTextBuffer,
  },
}: {
  destination: PubkeyType;
  encryptedAndWrapped: EncryptedMessageDetails;
}): Promise<StoreRequest05> {
  const shared05Arguments = {
    encryptedData: encryptedAndWrappedData,
    dbMessageIdentifier: identifier || null,
    ttlMs: ttl,
    destination,
    namespace,
    createdAtNetworkTimestamp: networkTimestamp,
    plainTextBuffer,
  };
  if (namespace === SnodeNamespaces.Default || namespace === SnodeNamespaces.LegacyClosedGroup) {
    return new StoreUserMessageSubRequest(shared05Arguments);
  }
  if (SnodeNamespace.isUserConfigNamespace(namespace)) {
    return new StoreUserConfigSubRequest(shared05Arguments);
  }

  window.log.error(
    `unhandled messageToRequest05 case with details: ${ed25519Str(destination)},namespace: ${namespace}`
  );
  throw new Error(
    `unhandled messageToRequest05 case for 05 ${ed25519Str(destination)} and namespace ${namespace}`
  );
}

async function messageToRequest03({
  destination,
  encryptedAndWrapped: { namespace, encryptedAndWrappedData, identifier, ttl, networkTimestamp },
}: {
  destination: GroupPubkeyType;
  encryptedAndWrapped: Pick<
    EncryptAndWrapMessageResults,
    'namespace' | 'encryptedAndWrappedData' | 'identifier' | 'ttl' | 'networkTimestamp'
  >;
}): Promise<StoreRequest03> {
  const group = await UserGroupsWrapperActions.getGroup(destination);
  if (!group) {
    window.log.warn(
      `messageToRequest03: no such group found in wrapper: ${ed25519Str(destination)}`
    );
    throw new Error('messageToRequest03: no such group found in wrapper');
  }
  const shared03Arguments = {
    encryptedData: encryptedAndWrappedData,
    namespace,
    ttlMs: ttl,
    groupPk: destination,
    dbMessageIdentifier: identifier || null,
    createdAtNetworkTimestamp: networkTimestamp,
    ...group,
  };
  if (
    SnodeNamespace.isGroupConfigNamespace(namespace) ||
    namespace === SnodeNamespaces.ClosedGroupMessages
  ) {
    return new StoreGroupMessageSubRequest(shared03Arguments);
  }
  window.log.error(
    `unhandled messageToRequest03 case with details: ${ed25519Str(destination)},namespace: ${namespace}`
  );
  throw new Error(
    `unhandled messageToRequest03 case for 03 ${ed25519Str(destination)} and namespace ${namespace}`
  );
}

async function messageToRequest<T extends GroupPubkeyType | PubkeyType>({
  destination,
  encryptedAndWrapped,
}: {
  destination: T;
  encryptedAndWrapped: EncryptedMessageDetails;
}): Promise<PubkeyToRequestType<T>> {
  if (PubKey.is03Pubkey(destination)) {
    const req = await messageToRequest03({ destination, encryptedAndWrapped });
    return req as PubkeyToRequestType<T>; // this is mandatory, sadly
  }
  if (PubKey.is05Pubkey(destination)) {
    const req = await messageToRequest05({
      destination,
      encryptedAndWrapped,
    });
    return req as PubkeyToRequestType<T>; // this is mandatory, sadly
  }

  throw new Error('messageToRequest: unhandled case');
}

async function messagesToRequests<T extends GroupPubkeyType | PubkeyType>({
  destination,
  encryptedAndWrappedArr,
}: {
  destination: T;
  encryptedAndWrappedArr: Array<EncryptedMessageDetails>;
}): Promise<Array<PubkeyToRequestType<T>>> {
  const subRequests: Array<PubkeyToRequestType<T>> = [];
  for (let index = 0; index < encryptedAndWrappedArr.length; index++) {
    const encryptedAndWrapped = encryptedAndWrappedArr[index];
    // eslint-disable-next-line no-await-in-loop
    const req = await messageToRequest({ destination, encryptedAndWrapped });
    subRequests.push(req);
  }
  return subRequests;
}

/**
 * Send a single message via service nodes.
 *
 * @param message The message to send.
 * @param attempts The amount of times to attempt sending. Minimum value is 1.
 */

async function sendSingleMessage({
  message,
  retryMinTimeout = 100,
  attempts = 3,
  isSyncMessage,
}: {
  message: OutgoingRawMessage;
  attempts?: number;
  retryMinTimeout?: number; // in ms
  isSyncMessage: boolean;
}): Promise<{ wrappedEnvelope: Uint8Array; effectiveTimestamp: number }> {
  const destination = message.device;
  if (!PubKey.is03Pubkey(destination) && !PubKey.is05Pubkey(destination)) {
    throw new Error('MessageSender rawMessage was given invalid pubkey');
  }
  return pRetry(
    async () => {
      const recipient = PubKey.cast(message.device);

      // we can only have a single message in this send function for now
      const [encryptedAndWrapped] = await encryptMessagesAndWrap([
        {
          destination: message.device,
          plainTextBuffer: message.plainTextBuffer,
          namespace: message.namespace,
          ttl: message.ttl,
          identifier: message.identifier,
          networkTimestamp: message.networkTimestampCreated,
          isSyncMessage: Boolean(isSyncMessage),
        },
      ]);

      // make sure to update the local sent_at timestamp, because sometimes, we will get the just pushed message in the receiver side
      // before we return from the await below.
      // and the isDuplicate messages relies on sent_at timestamp to be valid.
      const found = await Data.getMessageById(encryptedAndWrapped.identifier);

      // make sure to not update the sent timestamp if this a currently syncing message
      if (found && !found.get('sentSync')) {
        found.set({ sent_at: encryptedAndWrapped.networkTimestamp });
        await found.commit();
      }
      const isSyncedDeleteAfterReadMessage =
        found &&
        UserUtils.isUsFromCache(recipient.key) &&
        found.getExpirationType() === 'deleteAfterRead' &&
        found.getExpireTimerSeconds() > 0 &&
        encryptedAndWrapped.isSyncMessage;

      let overridenTtl = encryptedAndWrapped.ttl;
      if (isSyncedDeleteAfterReadMessage && found.getExpireTimerSeconds() > 0) {
        const asMs = found.getExpireTimerSeconds() * 1000;
        window.log.debug(`overriding ttl for synced DaR message to ${asMs}`);
        overridenTtl = asMs;
      }

      const subRequests = await messagesToRequests({
        encryptedAndWrappedArr: [{ ...encryptedAndWrapped, ttl: overridenTtl }],
        destination,
      });

      const targetNode = await SnodePool.getNodeFromSwarmOrThrow(destination);
      const batchResult = await BatchRequests.doUnsignedSnodeBatchRequestNoRetries(
        subRequests,
        targetNode,
        6000,
        destination,
        false
      );

      await handleBatchResultWithSubRequests({ batchResult, subRequests, destination });

      return {
        wrappedEnvelope: encryptedAndWrapped.encryptedAndWrappedData,
        effectiveTimestamp: encryptedAndWrapped.networkTimestamp,
      };
    },
    {
      retries: Math.max(attempts - 1, 0),
      factor: 1,
      minTimeout: retryMinTimeout || MessageSender.getMinRetryTimeout(),
    }
  );
}

async function getSignatureParamsFromNamespace(
  { namespace }: { namespace: SnodeNamespaces },
  destination: string
): Promise<SigResultSubAccount | SigResultAdmin | SnodeSignatureResult | object> {
  const store = 'store' as const;
  if (SnodeNamespace.isUserConfigNamespace(namespace)) {
    const ourPrivKey = (await UserUtils.getUserED25519KeyPairBytes())?.privKeyBytes;
    if (!ourPrivKey) {
      throw new Error(
        'getSignatureParamsFromNamespace UserUtils.getUserED25519KeyPairBytes is empty'
      );
    }
    return SnodeSignature.getSnodeSignatureParamsUs({
      method: store,
      namespace,
    });
  }

  if (
    SnodeNamespace.isGroupConfigNamespace(namespace) ||
    namespace === SnodeNamespaces.ClosedGroupMessages ||
    namespace === SnodeNamespaces.ClosedGroupRevokedRetrievableMessages
  ) {
    if (!PubKey.is03Pubkey(destination)) {
      throw new Error(
        'getSignatureParamsFromNamespace: groupconfig namespace required a 03 pubkey'
      );
    }
    const found = await UserGroupsWrapperActions.getGroup(destination);
    return SnodeGroupSignature.getSnodeGroupSignature({
      method: store,
      namespace,
      group: found,
    });
  }
  // no signature required for this namespace/pubkey combo
  return {};
}

async function signSubRequests(
  params: Array<RawSnodeSubRequests>
): Promise<Array<BuiltSnodeSubRequests>> {
  const signedRequests: Array<BuiltSnodeSubRequests> = await Promise.all(
    params.map(p => {
      return p.build();
    })
  );

  return signedRequests;
}

type DeleteHashesRequestPerPubkey<T extends PubkeyType | GroupPubkeyType> = T extends PubkeyType
  ? DeleteHashesFromUserNodeSubRequest
  : DeleteHashesFromGroupNodeSubRequest;

async function sendMessagesDataToSnode<T extends PubkeyType | GroupPubkeyType>(
  storeRequests: StoreRequestsPerPubkey<T>,
  asssociatedWith: T,
  {
    revokeSubRequest,
    unrevokeSubRequest,
    deleteHashesSubRequest,
    deleteAllMessagesSubRequest,
  }: WithRevokeSubRequest & {
    deleteAllMessagesSubRequest?: DeleteAllFromGroupMsgNodeSubRequest;
    deleteHashesSubRequest?: DeleteHashesRequestPerPubkey<T>;
  },
  method: MethodBatchType
): Promise<NotEmptyArrayOfBatchResults> {
  if (!asssociatedWith) {
    throw new Error('sendMessagesDataToSnode first subrequest pubkey needs to be set');
  }

  if (storeRequests.some(m => m.destination !== asssociatedWith)) {
    throw new Error(
      'sendMessagesDataToSnode tried to send batchrequest containing subrequest not for the right destination'
    );
  }

  const rawRequests = compact([
    ...storeRequests,
    deleteHashesSubRequest,
    revokeSubRequest,
    unrevokeSubRequest,
    deleteAllMessagesSubRequest,
  ]);
  const targetNode = await SnodePool.getNodeFromSwarmOrThrow(asssociatedWith);

  try {
    const storeResults = await BatchRequests.doUnsignedSnodeBatchRequestNoRetries(
      rawRequests,
      targetNode,
      6000,
      asssociatedWith,
      false,
      method
    );

    if (!storeResults || !storeResults.length) {
      window?.log?.warn(
        `SessionSnodeAPI::doUnsignedSnodeBatchRequestNoRetries on ${targetNode.ip}:${targetNode.port} returned falsish value`,
        storeResults
      );
      throw new Error('doUnsignedSnodeBatchRequestNoRetries: Invalid result');
    }
    await handleBatchResultWithSubRequests({
      batchResult: storeResults,
      subRequests: rawRequests,
      destination: asssociatedWith,
    });

    const firstResult = storeResults[0];

    if (firstResult.code !== 200) {
      window?.log?.warn(
        'first result status is not 200 for sendMessagesDataToSnode but: ',
        firstResult.code
      );
      throw new Error('sendMessagesDataToSnode: Invalid status code');
    }

    GetNetworkTime.handleTimestampOffsetFromNetwork('store', firstResult.body.t);

    if (!isEmpty(storeResults)) {
      window?.log?.info(
        `sendMessagesDataToSnode - Successfully stored messages to ${ed25519Str(
          asssociatedWith
        )} via ${ed25519Str(targetNode.pubkey_ed25519)} to namespaces: ${storeRequests.map(m => SnodeNamespace.toRole(m.namespace)).join(', ')}`
      );
    }

    return storeResults;
  } catch (e) {
    const snodeStr = targetNode ? `${ed25519Str(targetNode.pubkey_ed25519)}` : 'null';
    window?.log?.warn(
      `sendMessagesDataToSnode - "${e.code}:${e.message}" to ${asssociatedWith} via snode:${snodeStr}`
    );
    throw e;
  }
}

function encryptionBasedOnConversation(destination: PubKey) {
  if (ConvoHub.use().get(destination.key)?.isClosedGroup()) {
    return SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE;
  }
  return SignalService.Envelope.Type.SESSION_MESSAGE;
}

type SharedEncryptAndWrap = {
  ttl: number;
  identifier: string;
  isSyncMessage: boolean;
  plainTextBuffer: Uint8Array;
};

type EncryptAndWrapMessage = {
  destination: string;
  namespace: number;
  networkTimestamp: number;
} & SharedEncryptAndWrap;

type EncryptAndWrapMessageResults = {
  networkTimestamp: number;
  encryptedAndWrappedData: Uint8Array;
  namespace: number;
} & SharedEncryptAndWrap;

async function encryptForGroupV2(
  params: EncryptAndWrapMessage
): Promise<EncryptAndWrapMessageResults> {
  // Group v2 encryption works a bit differently: we encrypt the envelope itself through libsession.
  // We essentially need to do the opposite of the usual encryption which is send envelope unencrypted with content encrypted.
  const {
    destination,
    identifier,
    isSyncMessage: syncMessage,
    namespace,
    plainTextBuffer,
    ttl,
    networkTimestamp,
  } = params;

  const envelope = MessageWrapper.wrapContentIntoEnvelope(
    SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE,
    destination,
    networkTimestamp,
    plainTextBuffer
  );

  const recipient = PubKey.cast(destination);

  const { cipherText } = await MessageEncrypter.encrypt(
    recipient,
    SignalService.Envelope.encode(envelope).finish(),
    encryptionBasedOnConversation(recipient)
  );

  return {
    networkTimestamp,
    encryptedAndWrappedData: cipherText,
    namespace,
    ttl,
    identifier,
    isSyncMessage: syncMessage,
    plainTextBuffer,
  };
}

async function encryptMessageAndWrap(
  params: EncryptAndWrapMessage
): Promise<EncryptAndWrapMessageResults> {
  const {
    destination,
    identifier,
    isSyncMessage: syncMessage,
    namespace,
    plainTextBuffer,
    ttl,
    networkTimestamp,
  } = params;

  if (PubKey.is03Pubkey(destination)) {
    return encryptForGroupV2(params);
  }

  // can only be legacy group or 1o1 chats here

  const recipient = PubKey.cast(destination);

  const { envelopeType, cipherText } = await MessageEncrypter.encrypt(
    recipient,
    plainTextBuffer,
    encryptionBasedOnConversation(recipient)
  );

  const envelope = MessageWrapper.wrapContentIntoEnvelope(
    envelopeType,
    recipient.key,
    networkTimestamp,
    cipherText
  );
  const data = MessageWrapper.wrapEnvelopeInWebSocketMessage(envelope);

  return {
    encryptedAndWrappedData: data,
    networkTimestamp,
    namespace,
    ttl,
    identifier,
    isSyncMessage: syncMessage,
    plainTextBuffer,
  };
}

async function encryptMessagesAndWrap(
  messages: Array<EncryptAndWrapMessage>
): Promise<Array<EncryptAndWrapMessageResults>> {
  return Promise.all(messages.map(encryptMessageAndWrap));
}

/**
 * Send an array of preencrypted data to the corresponding swarm.
 * Warning:
 *   This does not handle result of messages and marking messages as read, syncing them currently.
 *   For this, use the `MessageQueue.sendSingleMessage()` for now.
 *
 * @param params the data to deposit
 * @param destination the pubkey we should deposit those message to
 * @returns the hashes of successful deposit
 */
async function sendEncryptedDataToSnode<T extends GroupPubkeyType | PubkeyType>({
  destination,
  storeRequests,
  deleteHashesSubRequest,
  revokeSubRequest,
  unrevokeSubRequest,
  deleteAllMessagesSubRequest,
}: WithRevokeSubRequest & {
  storeRequests: StoreRequestsPerPubkey<T>; // keeping those as an array because the order needs to be enforced for some (groupkeys for instance)
  destination: T;
  deleteHashesSubRequest?: DeleteHashesRequestPerPubkey<T>;
  deleteAllMessagesSubRequest?: DeleteAllFromGroupMsgNodeSubRequest;
}): Promise<NotEmptyArrayOfBatchResults | null> {
  try {
    const batchResults = await pRetry(
      async () => {
        return MessageSender.sendMessagesDataToSnode(
          storeRequests,
          destination,
          {
            deleteHashesSubRequest,
            revokeSubRequest,
            unrevokeSubRequest,
            deleteAllMessagesSubRequest,
          },
          'sequence'
        );
      },
      {
        retries: 2,
        factor: 1,
        minTimeout: MessageSender.getMinRetryTimeout(),
        maxTimeout: 1000,
      }
    );

    if (!batchResults || isEmpty(batchResults)) {
      throw new Error('result is empty for sendEncryptedDataToSnode');
    }

    return batchResults;
  } catch (e) {
    window.log.warn(`sendEncryptedDataToSnode failed with ${e.message}`);
    return null;
  }
}

/**
 * Send an array of **not** preencrypted data to the corresponding swarm.
 * WARNING:
 *   This does not handle result of messages and marking messages as read, syncing them currently.
 *   For this, use the `MessageQueue.sendSingleMessage()` for now.
 *
 * @param messages the data to deposit (after encryption)
 * @param destination the pubkey we should deposit those message to
 */
async function sendUnencryptedDataToSnode<T extends GroupPubkeyType | PubkeyType>({
  destination,
  messages,
}: {
  // keeping those as an array because the order needs to be enforced for some (groupkeys for instance)
  destination: T;
  messages: Array<
    T extends GroupPubkeyType
      ? GroupUpdateMemberLeftMessage | GroupUpdateMemberLeftNotificationMessage
      : never
  >;
}) {
  const rawMessages: Array<EncryptAndWrapMessage> = messages.map(m => {
    return {
      networkTimestamp: m.createAtNetworkTimestamp,
      plainTextBuffer: m.plainTextBuffer(),
      ttl: m.ttl(),
      destination: m.destination,
      identifier: m.identifier,
      namespace: m.namespace,
      isSyncMessage: false,
    };
  });

  const encryptedAndWrappedArr = await encryptMessagesAndWrap(
    rawMessages.map(message => {
      return {
        destination,
        plainTextBuffer: message.plainTextBuffer,
        namespace: message.namespace,
        ttl: message.ttl,
        identifier: message.identifier,
        networkTimestamp: message.networkTimestamp,
        isSyncMessage: false,
      };
    })
  );

  const storeRequests = await messagesToRequests({
    encryptedAndWrappedArr,
    destination,
  });

  return sendEncryptedDataToSnode({
    destination,
    storeRequests,
  });
}

// ================ Open Group ================
/**
 * Send a message to an open group v2.
 * @param message The open group message.
 */
async function sendToOpenGroupV2(
  rawMessage: OpenGroupVisibleMessage,
  roomInfos: OpenGroupRequestCommonType,
  blinded: boolean,
  filesToLink: Array<number>
): Promise<OpenGroupMessageV2 | boolean> {
  // we agreed to pad message for opengroupv2
  const paddedBody = addMessagePadding(rawMessage.plainTextBuffer());
  const v2Message = new OpenGroupMessageV2({
    sentTimestamp: GetNetworkTime.now(),
    base64EncodedData: fromUInt8ArrayToBase64(paddedBody),
    filesToLink,
  });

  const msg = await sendSogsMessageOnionV4(
    roomInfos.serverUrl,
    roomInfos.roomId,
    new AbortController().signal,
    v2Message,
    blinded
  );
  return msg;
}

/**
 * Send a message to an open group v2.
 * @param message The open group message.
 */
async function sendToOpenGroupV2BlindedRequest(
  encryptedContent: Uint8Array,
  roomInfos: OpenGroupRequestCommonType,
  recipientBlindedId: string
): Promise<{ serverId: number; serverTimestamp: number }> {
  const v2Message = new OpenGroupMessageV2({
    sentTimestamp: GetNetworkTime.now(),
    base64EncodedData: fromUInt8ArrayToBase64(encryptedContent),
  });

  // Warning: sendMessageOnionV4BlindedRequest throws
  const msg = await sendMessageOnionV4BlindedRequest(
    roomInfos.serverUrl,
    roomInfos.roomId,
    new AbortController().signal,
    v2Message,
    recipientBlindedId
  );
  return msg;
}

export const MessageSender = {
  sendToOpenGroupV2BlindedRequest,
  sendMessagesDataToSnode,
  sendEncryptedDataToSnode,
  getMinRetryTimeout,
  sendToOpenGroupV2,
  sendSingleMessage,
  isContentSyncMessage,
  getSignatureParamsFromNamespace,
  signSubRequests,
  encryptMessagesAndWrap,
  sendUnencryptedDataToSnode,
};

/**
 * Note: this function does not handle the syncing logic of messages yet.
 * Use it to push message to group, to note to self, or with user messages which do not require a syncing logic
 */
async function handleBatchResultWithSubRequests({
  batchResult,
  destination,
  subRequests,
}: {
  batchResult: NotEmptyArrayOfBatchResults;
  subRequests: Array<RawSnodeSubRequests>;
  destination: string;
}) {
  const isDestinationClosedGroup = ConvoHub.use().get(destination)?.isClosedGroup();
  if (!batchResult || !isArray(batchResult) || isEmpty(batchResult)) {
    window.log.error('handleBatchResultWithSubRequests: invalid batch result ');
    return;
  }

  const seenHashes: Array<SeenMessageHashes> = [];
  for (let index = 0; index < subRequests.length; index++) {
    const subRequest = subRequests[index];

    // there are some things we need to do when storing messages
    // for groups/legacy groups or user (but not for config messages)
    if (
      subRequest instanceof StoreGroupMessageSubRequest ||
      subRequest instanceof StoreLegacyGroupMessageSubRequest ||
      subRequest instanceof StoreUserMessageSubRequest
    ) {
      const storedAt = batchResult?.[index]?.body?.t;
      const storedHash = batchResult?.[index]?.body?.hash;
      const subRequestStatusCode = batchResult?.[index]?.code;
      // TODO: the expiration is due to be returned by the storage server on "store" soon, we will then be able to use it instead of doing the storedAt + ttl logic below
      // if we have a hash and a storedAt, mark it as seen so we don't reprocess it on the next retrieve

      if (
        subRequestStatusCode === 200 &&
        !isEmpty(storedHash) &&
        isString(storedHash) &&
        isNumber(storedAt)
      ) {
        seenHashes.push({
          expiresAt: GetNetworkTime.now() + TTL_DEFAULT.CONTENT_MESSAGE, // non config msg expire at CONTENT_MESSAGE at most
          hash: storedHash,
        });

        // We need to store the hash of our synced message when for a 1o1. (as this is the one stored on our swarm)
        // For groups, we can just store that hash directly as the group's swarm is hosting all of the group messages
        if (subRequest.dbMessageIdentifier) {
          // eslint-disable-next-line no-await-in-loop
          await MessageSentHandler.handleSwarmMessageSentSuccess(
            {
              device: subRequest.destination,
              isDestinationClosedGroup,
              identifier: subRequest.dbMessageIdentifier,
              plainTextBuffer:
                subRequest instanceof StoreUserMessageSubRequest
                  ? subRequest.plainTextBuffer
                  : null,
            },
            subRequest.createdAtNetworkTimestamp,
            storedHash
          );
        }
      }
    }
  }
  await Data.saveSeenMessageHashes(seenHashes);
}
