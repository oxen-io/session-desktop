import _, { isFinite, isNumber } from 'lodash';
import { getMessageQueue } from '..';
import { ConversationTypeEnum } from '../../models/conversationAttributes';
import { addKeyPairToCacheAndDBIfNeeded } from '../../receiver/closedGroups';
import { ECKeyPair } from '../../receiver/keypairs';
import { openConversationWithMessages } from '../../state/ducks/conversations';
import { updateConfirmModal } from '../../state/ducks/modalDialog';
import { getSwarmPollingInstance } from '../apis/snode_api';
import { GetNetworkTime } from '../apis/snode_api/getNetworkTime';
import { SnodeNamespaces } from '../apis/snode_api/namespaces';
import { generateClosedGroupPublicKey, generateCurve25519KeyPairWithoutPrefix } from '../crypto';
import { ClosedGroup, GroupInfo } from '../group/closed-group';
import {
  ClosedGroupNewMessage,
  ClosedGroupNewMessageParams,
} from '../messages/outgoing/controlMessage/group/ClosedGroupNewMessage';
import { PubKey } from '../types';
import { UserUtils } from '../utils';
import { forceSyncConfigurationNowIfNeeded } from '../utils/sync/syncUtils';
import { ConvoHub } from './ConversationController';

/**
 * Creates a brand new closed group from user supplied details. This function generates a new identityKeyPair so cannot be used to restore a closed group.
 * @param groupName the name of this closed group
 * @param members the initial members of this closed group
 */
export async function createClosedGroup(groupName: string, members: Array<string>) {
  // this is all legacy group logic.
  // TODO: To be removed

  const setOfMembers = new Set(members);
  const us = UserUtils.getOurPubKeyStrFromCache();
  const groupPublicKey = await generateClosedGroupPublicKey();

  const encryptionKeyPair = await generateCurve25519KeyPairWithoutPrefix();
  if (!encryptionKeyPair) {
    throw new Error('Could not create encryption keypair for new closed group');
  }

  // Create the group
  const convo = await ConvoHub.use().getOrCreateAndWait(groupPublicKey, ConversationTypeEnum.GROUP);

  await convo.setIsApproved(true, false);

  // Ensure the current user is a member
  setOfMembers.add(us);
  const listOfMembers = [...setOfMembers];
  const admins = [us];

  const existingExpirationType = 'unknown';
  const existingExpireTimer = 0;

  const groupDetails: GroupInfo = {
    id: groupPublicKey,
    name: groupName,
    members: listOfMembers,
    admins,
    activeAt: Date.now(),
    // TODO This is only applicable for old closed groups - will be removed in future
    expirationType: existingExpirationType,
    expireTimer: existingExpireTimer,
  };

  // we don't want the initial "AAA and You joined the group" anymore

  // be sure to call this before sending the message.
  // the sending pipeline needs to know from GroupUtils when a message is for a medium group
  await ClosedGroup.updateOrCreateClosedGroup(groupDetails);
  await convo.commit();
  convo.updateLastMessage();

  // Send a closed group update message to all members individually.
  // Note: we do not make those messages expire
  const allInvitesSent = await sendToGroupMembers(
    listOfMembers,
    groupPublicKey,
    groupName,
    admins,
    encryptionKeyPair
  );

  if (allInvitesSent) {
    const newHexKeypair = encryptionKeyPair.toHexKeyPair();
    await addKeyPairToCacheAndDBIfNeeded(groupPublicKey, newHexKeypair);
    // Subscribe to this group id
    getSwarmPollingInstance().addGroupId(new PubKey(groupPublicKey));
  }
  // commit again as now the keypair is saved and can be added to the libsession wrapper UserGroup
  await convo.commit();

  await forceSyncConfigurationNowIfNeeded();

  await openConversationWithMessages({ conversationKey: groupPublicKey, messageId: null });
}

/**
 * Sends a group invite message to each member of the group.
 * @returns Array of promises for group invite messages sent to group members.
 */
async function sendToGroupMembers(
  listOfMembers: Array<string>,
  groupPublicKey: string,
  groupName: string,
  admins: Array<string>,
  encryptionKeyPair: ECKeyPair,
  isRetry: boolean = false
): Promise<any> {
  const promises = createInvitePromises(
    listOfMembers,
    groupPublicKey,
    groupName,
    admins,
    encryptionKeyPair
  );
  window?.log?.info(`Sending invites for group ${groupPublicKey} to ${listOfMembers}`);
  // evaluating if all invites sent, if failed give the option to retry failed invites via modal dialog
  const inviteResults = await Promise.all(promises);
  const allInvitesSent = _.every(inviteResults, inviteResult => {
    return isNumber(inviteResult) && isFinite(inviteResult);
  });

  if (allInvitesSent) {
    if (isRetry) {
      const invitesTitle =
        inviteResults.length > 1
          ? window.i18n('closedGroupInviteSuccessTitlePlural')
          : window.i18n('closedGroupInviteSuccessTitle');

      window.inboxStore?.dispatch(
        updateConfirmModal({
          title: invitesTitle,
          message: window.i18n('closedGroupInviteSuccessMessage'),
          hideCancel: true,
          onClickClose: () => {
            window.inboxStore?.dispatch(updateConfirmModal(null));
          },
        })
      );
    }
    return allInvitesSent;
  }
  // Confirmation dialog that recursively calls sendToGroupMembers on resolve

  window.inboxStore?.dispatch(
    updateConfirmModal({
      title:
        inviteResults.length > 1
          ? window.i18n('closedGroupInviteFailTitlePlural')
          : window.i18n('closedGroupInviteFailTitle'),
      message:
        inviteResults.length > 1
          ? window.i18n('closedGroupInviteFailMessagePlural')
          : window.i18n('closedGroupInviteFailMessage'),
      okText: window.i18n('closedGroupInviteOkText'),
      onClickOk: async () => {
        const membersToResend: Array<string> = new Array<string>();
        inviteResults.forEach((result, index) => {
          const member = listOfMembers[index];
          // group invite must always contain the admin member.
          if (result === null || admins.includes(member)) {
            membersToResend.push(member);
          }
        });
        if (membersToResend.length > 0) {
          const isRetrySend = true;
          await sendToGroupMembers(
            membersToResend,
            groupPublicKey,
            groupName,
            admins,
            encryptionKeyPair,
            isRetrySend
          );
        }
      },
      onClickClose: () => {
        window.inboxStore?.dispatch(updateConfirmModal(null));
      },
    })
  );

  return allInvitesSent;
}

function createInvitePromises(
  listOfMembers: Array<string>,
  groupPublicKey: string,
  groupName: string,
  admins: Array<string>,
  encryptionKeyPair: ECKeyPair
) {
  const createAtNetworkTimestamp = GetNetworkTime.now();

  return listOfMembers.map(async m => {
    const messageParams: ClosedGroupNewMessageParams = {
      groupId: groupPublicKey,
      name: groupName,
      members: listOfMembers,
      admins,
      keypair: encryptionKeyPair,
      createAtNetworkTimestamp,
      expirationType: null, // we keep that one **not** expiring
      expireTimer: 0,
    };
    const message = new ClosedGroupNewMessage(messageParams);
    return getMessageQueue().sendTo1o1NonDurably({
      pubkey: PubKey.cast(m),
      message,
      namespace: SnodeNamespaces.Default,
    });
  });
}
