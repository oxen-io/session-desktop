/* eslint-disable no-await-in-loop */
/* eslint-disable more/no-then */
import { ConvoVolatileType, GroupPubkeyType, PubkeyType } from 'libsession_util_nodejs';
import { isEmpty, isNil } from 'lodash';

import { Data } from '../../data/data';
import { OpenGroupData } from '../../data/opengroups';
import { ConversationCollection, ConversationModel } from '../../models/conversation';
import {
  actions as conversationActions,
  resetConversationExternal,
} from '../../state/ducks/conversations';
import { BlockedNumberController } from '../../util';
import { getOpenGroupManager } from '../apis/open_group_api/opengroupV2/OpenGroupManagerV2';
import { PubKey } from '../types';

import { getMessageQueue } from '..';
import { ConfigDumpData } from '../../data/configDump/configDump';
import { deleteAllMessagesByConvoIdNoConfirmation } from '../../interactions/conversationInteractions';
import { CONVERSATION_PRIORITIES, ConversationTypeEnum } from '../../models/conversationAttributes';
import { removeAllClosedGroupEncryptionKeyPairs } from '../../receiver/closedGroups';
import { groupInfoActions } from '../../state/ducks/metaGroups';
import { getCurrentlySelectedConversationOutsideRedux } from '../../state/selectors/conversations';
import { assertUnreachable } from '../../types/sqlSharedTypes';
import {
  MetaGroupWrapperActions,
  UserGroupsWrapperActions,
} from '../../webworker/workers/browser/libsession_worker_interface';
import { OpenGroupUtils } from '../apis/open_group_api/utils';
import { getSwarmPollingInstance } from '../apis/snode_api';
import { DeleteAllFromGroupMsgNodeSubRequest } from '../apis/snode_api/SnodeRequestTypes';
import { GetNetworkTime } from '../apis/snode_api/getNetworkTime';
import { SnodeNamespaces } from '../apis/snode_api/namespaces';
import { ClosedGroupMemberLeftMessage } from '../messages/outgoing/controlMessage/group/ClosedGroupMemberLeftMessage';
import { GroupUpdateMemberLeftMessage } from '../messages/outgoing/controlMessage/group_v2/to_group/GroupUpdateMemberLeftMessage';
import { GroupUpdateMemberLeftNotificationMessage } from '../messages/outgoing/controlMessage/group_v2/to_group/GroupUpdateMemberLeftNotificationMessage';
import { MessageSender } from '../sending';
import { UserUtils } from '../utils';
import { ed25519Str } from '../utils/String';
import { PreConditionFailed } from '../utils/errors';
import { RunJobResult } from '../utils/job_runners/PersistedJob';
import { GroupSync } from '../utils/job_runners/jobs/GroupSyncJob';
import { UserSync } from '../utils/job_runners/jobs/UserSyncJob';
import { LibSessionUtil } from '../utils/libsession/libsession_utils';
import { SessionUtilContact } from '../utils/libsession/libsession_utils_contacts';
import { SessionUtilConvoInfoVolatile } from '../utils/libsession/libsession_utils_convo_info_volatile';
import { SessionUtilUserGroups } from '../utils/libsession/libsession_utils_user_groups';
import { DisappearingMessages } from '../disappearing_messages';

let instance: ConvoController | null;

const getConvoHub = () => {
  if (instance) {
    return instance;
  }
  instance = new ConvoController();

  return instance;
};

type DeleteOptions = { fromSyncMessage: boolean };

class ConvoController {
  private readonly conversations: ConversationCollection;
  private _initialFetchComplete: boolean = false;
  private _convoHubInitialPromise?: Promise<any>;

  /**
   * Do not call this constructor. You get the ConvoHub through ConvoHub.use() only
   */
  constructor() {
    this.conversations = new ConversationCollection();
  }

  // FIXME this could return | undefined
  public get(id: string): ConversationModel {
    if (!this._initialFetchComplete) {
      throw new Error('ConvoHub.use().get() needs complete initial fetch');
    }

    return this.conversations.get(id);
  }

  public getOrThrow(id: string): ConversationModel {
    if (!this._initialFetchComplete) {
      throw new Error('ConvoHub.use().get() needs complete initial fetch');
    }

    const convo = this.conversations.get(id);

    if (convo) {
      return convo;
    }
    throw new Error(`Conversation ${id} does not exist on ConvoHub.use().get()`);
  }
  // Needed for some model setup which happens during the initial fetch() call below
  public getUnsafe(id: string): ConversationModel | undefined {
    return this.conversations.get(id);
  }

  public getOrCreate(id: string, type: ConversationTypeEnum) {
    if (typeof id !== 'string') {
      throw new TypeError("'id' must be a string");
    }

    if (
      type !== ConversationTypeEnum.PRIVATE &&
      type !== ConversationTypeEnum.GROUP &&
      type !== ConversationTypeEnum.GROUPV2
    ) {
      throw new TypeError(`'type' must be 'private' or 'group' or 'groupv2' but got: '${type}'`);
    }

    if (type === ConversationTypeEnum.GROUPV2 && !PubKey.is03Pubkey(id)) {
      throw new Error(
        'required v3 closed group but the pubkey does not match the 03 prefix for them'
      );
    }

    if (!this._initialFetchComplete) {
      throw new Error('ConvoHub.use().get() needs complete initial fetch');
    }

    if (this.conversations.get(id)) {
      return this.conversations.get(id) as ConversationModel;
    }

    const conversation = this.conversations.add({
      id,
      type,
    });

    const create = async () => {
      try {
        // this saves to DB and to the required wrapper
        await conversation.commit();
      } catch (error) {
        window?.log?.error(
          'Conversation save failed! ',
          id,
          type,
          'Error:',
          error && error.stack ? error.stack : error
        );
        throw error;
      }

      window?.inboxStore?.dispatch(
        conversationActions.conversationAdded({
          id: conversation.id,
          data: conversation.getConversationModelProps(),
        })
      );

      return conversation;
    };

    conversation.initialPromise = create();

    return conversation;
  }

  public getContactProfileNameOrShortenedPubKey(pubKey: string): string {
    const conversation = ConvoHub.use().get(pubKey);
    if (!conversation) {
      return pubKey;
    }
    return conversation.getContactProfileNameOrShortenedPubKey();
  }

  public async getOrCreateAndWait(
    id: string | PubKey,
    type: ConversationTypeEnum
  ): Promise<ConversationModel> {
    const convoHubInitialPromise =
      this._convoHubInitialPromise !== undefined ? this._convoHubInitialPromise : Promise.resolve();
    await convoHubInitialPromise;

    if (!id) {
      throw new Error('getOrCreateAndWait: invalid id passed.');
    }
    const pubkey = id && (id as any).key ? (id as any).key : id;
    const conversation = this.getOrCreate(pubkey, type);

    if (conversation) {
      return conversation.initialPromise.then(() => conversation);
    }

    return Promise.reject(new Error('getOrCreateAndWait: did not get conversation'));
  }

  /**
   * Usually, we want to mark private contact deleted as inactive (active_at = undefined).
   * That way we can still have the username and avatar for them, but they won't appear in search results etc.
   * For the blinded contact deletion though, we want to delete it completely because we merged it to an unblinded convo.
   */
  public async deleteBlindedContact(blindedId: string) {
    if (!this._initialFetchComplete) {
      throw new Error('ConvoHub.use().deleteBlindedContact() needs complete initial fetch');
    }
    if (!PubKey.isBlinded(blindedId)) {
      throw new Error('deleteBlindedContact allow accepts blinded id');
    }
    window.log.info(`deleteBlindedContact with ${blindedId}`);
    const conversation = this.conversations.get(blindedId);
    if (!conversation) {
      window.log.warn(`deleteBlindedContact no such convo ${blindedId}`);
      return;
    }

    // we remove the messages left in this convo. The caller has to merge them if needed
    await deleteAllMessagesByConvoIdNoConfirmation(conversation.id);

    await conversation.setIsApproved(false, false);
    await conversation.setDidApproveMe(false, false);
    await conversation.commit();
  }

  public async deleteLegacyGroup(
    groupPk: PubkeyType,
    { sendLeaveMessage, fromSyncMessage }: DeleteOptions & { sendLeaveMessage: boolean }
  ) {
    if (!PubKey.is05Pubkey(groupPk)) {
      throw new PreConditionFailed('deleteLegacyGroup excepts a 05 group');
    }

    window.log.info(
      `deleteLegacyGroup: ${ed25519Str(groupPk)}, sendLeaveMessage:${sendLeaveMessage}, fromSyncMessage:${fromSyncMessage}`
    );

    // this deletes all messages in the conversation
    const conversation = await this.deleteConvoInitialChecks(groupPk, 'LegacyGroup', false);
    if (!conversation || !conversation.isClosedGroup()) {
      return;
    }
    // we don't need to keep polling anymore.
    getSwarmPollingInstance().removePubkey(groupPk, 'deleteLegacyGroup');

    // send the leave message before we delete everything for this group (including the key!)
    if (sendLeaveMessage) {
      await leaveClosedGroup(groupPk, fromSyncMessage);
    }

    await removeLegacyGroupFromWrappers(groupPk);

    // we never keep a left legacy group. Only fully remove it.
    await this.removeGroupOrCommunityFromDBAndRedux(groupPk);
    await UserSync.queueNewJobIfNeeded();
  }

  public async deleteGroup(
    groupPk: GroupPubkeyType,
    {
      sendLeaveMessage,
      fromSyncMessage,
      emptyGroupButKeepAsKicked,
      deleteAllMessagesOnSwarm,
      forceDestroyForAllMembers,
    }: DeleteOptions & {
      sendLeaveMessage: boolean;
      emptyGroupButKeepAsKicked: boolean;
      deleteAllMessagesOnSwarm: boolean;
      forceDestroyForAllMembers: boolean;
    }
  ) {
    if (!PubKey.is03Pubkey(groupPk)) {
      throw new PreConditionFailed('deleteGroup excepts a 03-group');
    }

    window.log.info(
      `deleteGroup: ${ed25519Str(groupPk)}, sendLeaveMessage:${sendLeaveMessage}, fromSyncMessage:${fromSyncMessage}, emptyGroupButKeepAsKicked:${emptyGroupButKeepAsKicked}, deleteAllMessagesOnSwarm:${deleteAllMessagesOnSwarm}, forceDestroyForAllMembers:${forceDestroyForAllMembers}`
    );

    // this deletes all messages in the conversation
    const conversation = await this.deleteConvoInitialChecks(groupPk, 'Group', false);
    if (!conversation || !conversation.isClosedGroup()) {
      return;
    }
    // we don't need to keep polling anymore.
    getSwarmPollingInstance().removePubkey(groupPk, 'deleteGroup');

    const group = await UserGroupsWrapperActions.getGroup(groupPk);

    // send the leave message before we delete everything for this group (including the key!)
    // Note: if we were kicked, we already lost the authdata/secretKey for it, so no need to try to send our message.
    if (sendLeaveMessage && !group?.kicked) {
      await leaveClosedGroup(groupPk, fromSyncMessage);
    }
    // a group 03 can be removed fully or kept empty as kicked.
    // when it was pendingInvite, we delete it fully,
    // when it was not, we empty the group but keep it with the "you have been kicked" message
    // Note: the pendingInvite=true case cannot really happen as we wouldn't be polling from that group (and so, not get the message kicking us)
    if (emptyGroupButKeepAsKicked) {
      // delete the secretKey/authData if we had it. If we need it for something, it has to be done before this call.
      if (group) {
        group.authData = null;
        group.secretKey = null;
        group.disappearingTimerSeconds = undefined;
        group.kicked = true;
        await UserGroupsWrapperActions.setGroup(group);
      }
    } else {
      try {
        const us = UserUtils.getOurPubKeyStrFromCache();
        const allMembers = await MetaGroupWrapperActions.memberGetAll(groupPk);
        const otherAdminsCount = allMembers
          .filter(m => m.admin || m.promoted)
          .filter(m => m.pubkeyHex !== us).length;
        const weAreLastAdmin = otherAdminsCount === 0;
        const infos = await MetaGroupWrapperActions.infoGet(groupPk);
        const fromUserGroup = await UserGroupsWrapperActions.getGroup(groupPk);
        if (!infos || !fromUserGroup || isEmpty(infos) || isEmpty(fromUserGroup)) {
          throw new Error('deleteGroup: some required data not present');
        }
        const { secretKey } = fromUserGroup;

        // check if we are the last admin
        if (secretKey && !isEmpty(secretKey) && (weAreLastAdmin || forceDestroyForAllMembers)) {
          const deleteAllMessagesSubRequest = deleteAllMessagesOnSwarm
            ? new DeleteAllFromGroupMsgNodeSubRequest({
                groupPk,
                secretKey,
              })
            : undefined;

          // this marks the group info as deleted. We need to push those details
          await MetaGroupWrapperActions.infoDestroy(groupPk);
          const lastPushResult = await GroupSync.pushChangesToGroupSwarmIfNeeded({
            groupPk,
            deleteAllMessagesSubRequest,
            extraStoreRequests: [],
          });
          if (lastPushResult !== RunJobResult.Success) {
            throw new Error(`Failed to destroyGroupDetails for pk ${ed25519Str(groupPk)}`);
          }
        }
      } catch (e) {
        // if that group was already freed this will happen.
        // we still want to delete it entirely though
        window.log.warn(`deleteGroup: MetaGroupWrapperActions failed with: ${e.message}`);
      }

      // this deletes the secretKey if we had it. If we need it for something, it has to be done before this call.
      await UserGroupsWrapperActions.eraseGroup(groupPk);

      // we are on the emptyGroupButKeepAsKicked=false case, so we remove it all
      await this.removeGroupOrCommunityFromDBAndRedux(groupPk);
    }

    await SessionUtilConvoInfoVolatile.removeGroupFromWrapper(groupPk);
    // release the memory (and the current meta-dumps in memory for that group)
    window.log.info(`freeing metagroup wrapper: ${ed25519Str(groupPk)}`);
    await MetaGroupWrapperActions.free(groupPk);
    // delete the dumps from the metagroup state only, not the details in the UserGroups wrapper itself.
    await ConfigDumpData.deleteDumpFor(groupPk);
    getSwarmPollingInstance().removePubkey(groupPk, 'deleteGroup');

    window.inboxStore.dispatch(groupInfoActions.removeGroupDetailsFromSlice({ groupPk }));
    await UserSync.queueNewJobIfNeeded();
  }

  public async deleteCommunity(convoId: string, options: DeleteOptions) {
    const conversation = await this.deleteConvoInitialChecks(convoId, 'Community', false);
    if (!conversation || !conversation.isPublic()) {
      return;
    }

    window?.log?.info('leaving community: ', conversation.id);
    const roomInfos = OpenGroupData.getV2OpenGroupRoom(conversation.id);
    if (roomInfos) {
      getOpenGroupManager().removeRoomFromPolledRooms(roomInfos);
    }
    await removeCommunityFromWrappers(conversation.id); // this call needs to fetch the pubkey
    await this.removeGroupOrCommunityFromDBAndRedux(conversation.id);

    if (!options.fromSyncMessage) {
      await UserSync.queueNewJobIfNeeded();
    }
  }

  public async delete1o1(
    id: string,
    options: DeleteOptions & { justHidePrivate?: boolean; keepMessages: boolean }
  ) {
    const conversation = await this.deleteConvoInitialChecks(id, '1o1', options.keepMessages);

    if (!conversation || !conversation.isPrivate()) {
      return;
    }

    if (options.justHidePrivate || isNil(options.justHidePrivate) || conversation.isMe()) {
      // we just set the hidden field to true
      // so the conversation still exists (needed for that user's profile in groups) but is not shown on the list of conversation.
      // We also keep the messages for now, as turning a contact as hidden might just be a temporary thing
      window.log.info(`deleteContact isPrivate, marking as hidden: ${id}`);
      conversation.set({
        priority: CONVERSATION_PRIORITIES.hidden,
      });
      // We don't remove entries from the contacts wrapper, so better keep corresponding convo volatile info for now (it will be pruned if needed)
      await conversation.commit(); // this updates the wrappers content to reflect the hidden state
    } else {
      window.log.info(`deleteContact isPrivate, reset fields and removing from wrapper: ${id}`);

      await conversation.setIsApproved(false, false);
      await conversation.setDidApproveMe(false, false);
      conversation.set('active_at', 0);
      await BlockedNumberController.unblockAll([conversation.id]);
      await conversation.commit(); // first commit to DB so the DB knows about the changes
      if (SessionUtilContact.isContactToStoreInWrapper(conversation)) {
        window.log.warn('isContactToStoreInWrapper still true for ', conversation.attributes);
      }
      if (conversation.id.startsWith('05')) {
        // make sure to filter blinded contacts as it will throw otherwise
        await SessionUtilContact.removeContactFromWrapper(conversation.id); // then remove the entry alltogether from the wrapper
        await SessionUtilConvoInfoVolatile.removeContactFromWrapper(conversation.id);
      }
      if (getCurrentlySelectedConversationOutsideRedux() === conversation.id) {
        window.inboxStore?.dispatch(resetConversationExternal());
      }
    }

    if (!options.fromSyncMessage) {
      await UserSync.queueNewJobIfNeeded();
    }
  }

  /**
   *
   * @returns the reference of the list of conversations stored.
   * Warning: You should not edit things directly from that list. This must only be used for reading things.
   * If you need to make a change, do the usual getConversationControler().get('the id you want to edit')
   */
  public getConversations(): Array<ConversationModel> {
    return this.conversations.models;
  }

  public async load() {
    if (this.conversations.length) {
      throw new Error('ConversationController: Already loaded!');
    }

    const load = async () => {
      try {
        const startLoad = Date.now();

        const convoModels = await Data.getAllConversations();
        this.conversations.add(convoModels);

        const start = Date.now();
        const numberOfVariants = LibSessionUtil.requiredUserVariants.length;
        for (let index = 0; index < convoModels.length; index++) {
          const convo = convoModels[index];
          for (let wrapperIndex = 0; wrapperIndex < numberOfVariants; wrapperIndex++) {
            const variant = LibSessionUtil.requiredUserVariants[wrapperIndex];

            switch (variant) {
              case 'UserConfig':
              case 'UserGroupsConfig':
                break;
              case 'ContactsConfig':
                if (SessionUtilContact.isContactToStoreInWrapper(convo)) {
                  await SessionUtilContact.refreshMappedValue(convo.id, true);
                }
                break;
              case 'ConvoInfoVolatileConfig':
                if (SessionUtilConvoInfoVolatile.isConvoToStoreInWrapper(convo)) {
                  await SessionUtilConvoInfoVolatile.refreshConvoVolatileCached(
                    convo.id,
                    Boolean(convo.isClosedGroup() && convo.id.startsWith('05')),
                    true
                  );

                  await convo.refreshInMemoryDetails();
                }
                break;

              default:
                assertUnreachable(
                  variant,
                  `ConversationController: load() unhandled case "${variant}"`
                );
            }
          }
        }
        window.log.info(`refreshAllWrappersMappedValues took ${Date.now() - start}ms`);

        this._initialFetchComplete = true;
        window?.log?.info(
          `ConversationController: done with initial fetch in ${Date.now() - startLoad}ms.`
        );
      } catch (error) {
        window?.log?.error(
          'ConversationController: initial fetch failed',
          error && error.stack ? error.stack : error
        );
        throw error;
      }
    };

    this._convoHubInitialPromise = load();

    return this._convoHubInitialPromise;
  }

  public loadPromise() {
    return this._convoHubInitialPromise;
  }

  public reset() {
    this._convoHubInitialPromise = Promise.resolve();
    this._initialFetchComplete = false;
    if (window?.inboxStore) {
      window.inboxStore?.dispatch(conversationActions.removeAllConversations());
    }
    this.conversations.reset([]);
  }

  private async deleteConvoInitialChecks(
    convoId: string,
    deleteType: ConvoVolatileType,
    keepMessages: boolean
  ) {
    if (!this._initialFetchComplete) {
      throw new Error(`ConvoHub.${deleteType}  needs complete initial fetch`);
    }

    window.log.info(`${deleteType} with ${ed25519Str(convoId)}`);

    const conversation = this.conversations.get(convoId);
    if (!conversation) {
      window.log.warn(`${deleteType} no such convo ${ed25519Str(convoId)}`);
      return null;
    }

    // Note in some cases (hiding a conversation) we don't want to delete the messages
    if (!keepMessages) {
      // those are the stuff to do for all conversation types
      window.log.info(`${deleteType} destroyingMessages: ${ed25519Str(convoId)}`);
      await deleteAllMessagesByConvoIdNoConfirmation(convoId);
      window.log.info(`${deleteType} messages destroyed: ${ed25519Str(convoId)}`);
    }

    return conversation;
  }

  private async removeGroupOrCommunityFromDBAndRedux(convoId: string) {
    window.log.info(`cleanUpGroupConversation, removing convo from DB: ${ed25519Str(convoId)}`);
    // not a private conversation, so not a contact for the ContactWrapper
    await Data.removeConversation(convoId);

    // remove the data from the opengrouprooms table too if needed
    if (convoId && OpenGroupUtils.isOpenGroupV2(convoId)) {
      // remove the roomInfos locally for this open group room including the pubkey
      try {
        await OpenGroupData.removeV2OpenGroupRoom(convoId);
      } catch (e) {
        window?.log?.info('removeV2OpenGroupRoom failed:', e);
      }
    }

    window.log.info(`cleanUpGroupConversation, convo removed from DB: ${ed25519Str(convoId)}`);
    const conversation = this.conversations.get(convoId);

    if (conversation) {
      this.conversations.remove(conversation);

      window?.inboxStore?.dispatch(
        conversationActions.conversationsChanged([conversation.getConversationModelProps()])
      );
    }
    window.inboxStore?.dispatch(conversationActions.conversationRemoved(convoId));

    window.log.info(`cleanUpGroupConversation, convo removed from store: ${ed25519Str(convoId)}`);
  }
}

/**
 * You most likely don't want to call this function directly, but instead use the deleteLegacyGroup() from the ConversationController as it will take care of more cleaningup.
 * This throws if a leaveMessage needs to be sent, but fails to be sent.
 *
 * Note: `fromSyncMessage` is used to know if we need to send a leave group message to the group first.
 * So if the user made the action on this device, fromSyncMessage should be false, but if it happened from a linked device polled update, set this to true.
 */
async function leaveClosedGroup(groupPk: PubkeyType | GroupPubkeyType, fromSyncMessage: boolean) {
  const convo = ConvoHub.use().get(groupPk);

  if (!convo || !convo.isClosedGroup()) {
    window?.log?.error('Cannot leave non-existing group');
    return;
  }

  const ourNumber = UserUtils.getOurPubKeyStrFromCache();
  const isCurrentUserAdmin = convo.weAreAdminUnblinded();

  let members: Array<string> = [];
  let admins: Array<string> = [];

  // if we are the admin, the group must be destroyed for every members
  if (isCurrentUserAdmin) {
    window?.log?.info('Admin left a closed group. We need to destroy it');
    convo.set({ left: true });
    members = [];
    admins = [];
  } else {
    // otherwise, just the exclude ourself from the members and trigger an update with this
    convo.set({ left: true });
    members = (convo.getGroupMembers() || []).filter((m: string) => m !== ourNumber);
    admins = convo.getGroupAdmins();
  }
  convo.set({ members });
  await convo.updateGroupAdmins(admins, false);
  await convo.commit();

  getSwarmPollingInstance().removePubkey(groupPk, 'leaveClosedGroup');

  if (fromSyncMessage) {
    // no need to send our leave message as our other device should already have sent it.
    return;
  }

  if (PubKey.is03Pubkey(groupPk)) {
    const group = await UserGroupsWrapperActions.getGroup(groupPk);
    if (!group) {
      throw new Error('leaveClosedGroup: group from UserGroupsWrapperActions is null ');
    }
    const createAtNetworkTimestamp = GetNetworkTime.now();
    // Send the update to the 03 group
    const ourLeavingMessage = new GroupUpdateMemberLeftMessage({
      createAtNetworkTimestamp,
      groupPk,
      expirationType: null, // we keep that one **not** expiring
      expireTimer: null,
    });

    const ourLeavingNotificationMessage = new GroupUpdateMemberLeftNotificationMessage({
      createAtNetworkTimestamp,
      groupPk,
      ...DisappearingMessages.getExpireDetailsForOutgoingMesssage(convo, createAtNetworkTimestamp), // this one should be expiring with the convo expiring details
    });

    window?.log?.info(
      `We are leaving the group ${ed25519Str(groupPk)}. Sending our leaving messages.`
    );
    // We might not be able to send our leaving messages (no encryption keypair, we were already removed, no network, etc).
    // If that happens, we should just remove everything from our current user.
    try {
      const results = await MessageSender.sendUnencryptedDataToSnode({
        destination: groupPk,
        messages: [ourLeavingNotificationMessage, ourLeavingMessage],
      });

      if (results?.[0].code !== 200) {
        throw new Error(
          `Even with the retries, leaving message for group ${ed25519Str(
            groupPk
          )} failed to be sent...`
        );
      }
    } catch (e) {
      window?.log?.warn(
        `failed to send our leaving messages for ${ed25519Str(groupPk)}:${e.message}`
      );
    }

    // the rest of the cleaning of that conversation is done in the `deleteClosedGroup()`

    return;
  }

  // TODO remove legacy group support
  const keypair = await Data.getLatestClosedGroupEncryptionKeyPair(groupPk);
  if (!keypair || isEmpty(keypair) || isEmpty(keypair.publicHex) || isEmpty(keypair.privateHex)) {
    // if we do not have a keypair, we won't be able to send our leaving message neither, so just skip sending it.
    // this can happen when getting a group from a broken libsession usergroup wrapper, but not only.
    return;
  }

  // Send the update to the group
  const ourLeavingMessage = new ClosedGroupMemberLeftMessage({
    createAtNetworkTimestamp: GetNetworkTime.now(),
    groupId: groupPk,
    expirationType: null, // we keep that one **not** expiring
    expireTimer: null,
  });

  window?.log?.info(`We are leaving the legacygroup ${groupPk}. Sending our leaving message.`);

  // if we do not have a keypair for that group, we can't send our leave message, so just skip the message sending part
  const wasSent = await getMessageQueue().sendToLegacyGroupNonDurably({
    message: ourLeavingMessage,
    namespace: SnodeNamespaces.LegacyClosedGroup,
    destination: groupPk,
  });
  // The leaving message might fail to be sent for some specific reason we want to still delete the group.
  // For instance, if we do not have the encryption keypair anymore, we cannot send our left message, but we should still delete its content
  if (wasSent) {
    window?.log?.info(
      `Leaving message sent ${ed25519Str(groupPk)}. Removing everything related to this group.`
    );
  } else {
    window?.log?.info(
      `Leaving message failed to be sent for ${ed25519Str(
        groupPk
      )}. But still removing everything related to this group....`
    );
  }
}

async function removeLegacyGroupFromWrappers(groupId: string) {
  getSwarmPollingInstance().removePubkey(groupId, 'removeLegacyGroupFromWrappers');

  await UserGroupsWrapperActions.eraseLegacyGroup(groupId);
  await SessionUtilConvoInfoVolatile.removeLegacyGroupFromWrapper(groupId);
  await removeAllClosedGroupEncryptionKeyPairs(groupId);
}

async function removeCommunityFromWrappers(conversationId: string) {
  if (!conversationId || !OpenGroupUtils.isOpenGroupV2(conversationId)) {
    return;
  }
  try {
    const fromWrapper = await UserGroupsWrapperActions.getCommunityByFullUrl(conversationId);
    if (fromWrapper?.fullUrlWithPubkey) {
      await SessionUtilConvoInfoVolatile.removeCommunityFromWrapper(
        conversationId,
        fromWrapper.fullUrlWithPubkey
      );
    }
  } catch (e) {
    window?.log?.info('SessionUtilConvoInfoVolatile.removeCommunityFromWrapper failed:', e.message);
  }

  // remove from the wrapper the entries before we remove the roomInfos, as we won't have the required community pubkey afterwards
  try {
    await SessionUtilUserGroups.removeCommunityFromWrapper(conversationId, conversationId);
  } catch (e) {
    window?.log?.info('SessionUtilUserGroups.removeCommunityFromWrapper failed:', e.message);
  }
}

export const ConvoHub = { use: getConvoHub };
