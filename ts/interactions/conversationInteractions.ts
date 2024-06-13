import { isNil } from 'lodash';
import {
  ConversationNotificationSettingType,
  ConversationTypeEnum,
  READ_MESSAGE_STATE,
} from '../models/conversationAttributes';
import { CallManager, PromiseUtils, SyncUtils, ToastUtils, UserUtils } from '../session/utils';

import { SessionButtonColor } from '../components/basic/SessionButton';
import { getCallMediaPermissionsSettings } from '../components/settings/SessionSettings';
import { Data } from '../data/data';
import { SettingsKey } from '../data/settings-key';
import { GroupV2Receiver } from '../receiver/groupv2/handleGroupV2Message';
import { uploadFileToFsWithOnionV4 } from '../session/apis/file_server_api/FileServerApi';
import { OpenGroupUtils } from '../session/apis/open_group_api/utils';
import { getSwarmPollingInstance } from '../session/apis/snode_api';
import { GetNetworkTime } from '../session/apis/snode_api/getNetworkTime';
import { ConvoHub } from '../session/conversations';
import { getSodiumRenderer } from '../session/crypto';
import { DecryptedAttachmentsManager } from '../session/crypto/DecryptedAttachmentsManager';
import { DisappearingMessageConversationModeType } from '../session/disappearing_messages/types';
import { PubKey } from '../session/types';
import { perfEnd, perfStart } from '../session/utils/Performance';
import { sleepFor } from '../session/utils/Promise';
import { ed25519Str, fromHexToArray, toHex } from '../session/utils/String';
import { UserSync } from '../session/utils/job_runners/jobs/UserSyncJob';
import { SessionUtilContact } from '../session/utils/libsession/libsession_utils_contacts';
import { forceSyncConfigurationNowIfNeeded } from '../session/utils/sync/syncUtils';
import {
  conversationReset,
  quoteMessage,
  resetConversationExternal,
} from '../state/ducks/conversations';
import {
  changeNickNameModal,
  updateAddModeratorsModal,
  updateBanOrUnbanUserModal,
  updateConfirmModal,
  updateGroupMembersModal,
  updateGroupNameModal,
  updateInviteContactModal,
  updateRemoveModeratorsModal,
} from '../state/ducks/modalDialog';
import { MIME } from '../types';
import { LocalizerKeys } from '../types/LocalizerKeys';
import { IMAGE_JPEG } from '../types/MIME';
import { processNewAttachment } from '../types/MessageAttachment';
import { urlToBlob } from '../types/attachments/VisualAttachment';
import { BlockedNumberController } from '../util/blockedNumberController';
import { encryptProfile } from '../util/crypto/profileEncrypter';
import { ReleasedFeatures } from '../util/releaseFeature';
import { Storage, setLastProfileUpdateTimestamp } from '../util/storage';
import { UserGroupsWrapperActions } from '../webworker/workers/browser/libsession_worker_interface';

export enum ConversationInteractionStatus {
  Start = 'start',
  Loading = 'loading',
  Error = 'error',
  Complete = 'complete',
}

export enum ConversationInteractionType {
  Hide = 'hide',
  Leave = 'leave',
}

export async function copyPublicKeyByConvoId(convoId: string) {
  if (OpenGroupUtils.isOpenGroupV2(convoId)) {
    const fromWrapper = await UserGroupsWrapperActions.getCommunityByFullUrl(convoId);

    if (!fromWrapper) {
      window.log.warn('opengroup to copy was not found in the UserGroupsWrapper');
      return;
    }

    if (fromWrapper.fullUrlWithPubkey) {
      window.clipboard.writeText(fromWrapper.fullUrlWithPubkey);
      ToastUtils.pushCopiedToClipBoard();
    }
  } else {
    window.clipboard.writeText(convoId);
  }
}

export async function blockConvoById(conversationId: string) {
  const conversation = ConvoHub.use().get(conversationId);

  if (!conversation.id || conversation.isPublic()) {
    return;
  }

  await BlockedNumberController.block(conversation.id);
  await conversation.commit();
  ToastUtils.pushToastSuccess('blocked', window.i18n('blocked'));
}

export async function unblockConvoById(conversationId: string) {
  const conversation = ConvoHub.use().get(conversationId);

  if (!conversation) {
    // we assume it's a block contact and not group.
    // this is to be able to unlock a contact we don't have a conversation with.
    await BlockedNumberController.unblockAll([conversationId]);
    ToastUtils.pushToastSuccess('unblocked', window.i18n('unblocked'));
    return;
  }
  if (!conversation.id || conversation.isPublic()) {
    return;
  }
  await BlockedNumberController.unblockAll([conversationId]);
  ToastUtils.pushToastSuccess('unblocked', window.i18n('unblocked'));
  await conversation.commit();
}

export const handleAcceptConversationRequest = async ({ convoId }: { convoId: string }) => {
  const convo = ConvoHub.use().get(convoId);
  if (!convo || (!convo.isPrivate() && !convo.isClosedGroupV2())) {
    return null;
  }
  const previousIsApproved = convo.isApproved();
  const previousDidApprovedMe = convo.didApproveMe();
  // Note: we don't mark as approvedMe = true, as we do not know if they did send us a message yet.
  await convo.setIsApproved(true, false);
  await convo.commit();
  void forceSyncConfigurationNowIfNeeded();

  if (convo.isPrivate()) {
    // we only need the approval message (and sending a reply) when we are accepting a message request. i.e. someone sent us a message already and we didn't accept it yet.
    if (!previousIsApproved && previousDidApprovedMe) {
      await convo.addOutgoingApprovalMessage(Date.now());
      await convo.sendMessageRequestResponse();
    }

    return null;
  }
  if (PubKey.is03Pubkey(convoId)) {
    const found = await UserGroupsWrapperActions.getGroup(convoId);
    if (!found) {
      window.log.warn('cannot approve a non existing group in usergroup');
      return null;
    }
    // this updates the wrapper and refresh the redux slice
    await UserGroupsWrapperActions.setGroup({ ...found, invitePending: false });

    // nothing else to do (and especially not wait for first poll) when the convo was already approved
    if (previousIsApproved) {
      return null;
    }
    const pollAndSendResponsePromise = new Promise(resolve => {
      getSwarmPollingInstance().addGroupId(convoId, async () => {
        // we need to do a first poll to fetch the keys etc before we can send our invite response
        // this is pretty hacky, but also an admin seeing a message from that user in the group will mark it as not pending anymore
        await sleepFor(2000);
        if (!previousIsApproved) {
          await GroupV2Receiver.sendInviteResponseToGroup({ groupPk: convoId });
        }
        window.log.info(
          `handleAcceptConversationRequest: first poll for group ${ed25519Str(convoId)} happened, we should have encryption keys now`
        );
        return resolve(true);
      });
    });

    // try at most 10s for the keys, and everything to come before continuing processing.
    // Note: this is important as otherwise the polling just hangs when sending a message to a group (as the cb in addGroupId() is never called back)
    const timeout = 10000;
    try {
      await PromiseUtils.timeout(pollAndSendResponsePromise, timeout);
    } catch (e) {
      window.log.warn(
        `handleAcceptConversationRequest: waited ${timeout}ms for first poll of group ${ed25519Str(convoId)} to happen, but timedout with: ${e.message}`
      );
    }
  }
  return null;
};

export async function declineConversationWithoutConfirm({
  alsoBlock,
  conversationId,
  currentlySelectedConvo,
  syncToDevices,
  conversationIdOrigin,
}: {
  conversationId: string;
  currentlySelectedConvo: string | undefined;
  syncToDevices: boolean;
  alsoBlock: boolean;
  conversationIdOrigin: string | null;
}) {
  const conversationToDecline = ConvoHub.use().get(conversationId);

  if (
    !conversationToDecline ||
    (!conversationToDecline.isPrivate() && !conversationToDecline.isClosedGroupV2())
  ) {
    window?.log?.info('No conversation to decline.');
    return;
  }
  window.log.debug(
    `declineConversationWithoutConfirm of ${ed25519Str(conversationId)}, alsoBlock:${alsoBlock}, conversationIdOrigin:${conversationIdOrigin ? ed25519Str(conversationIdOrigin) : '<none>'}`
  );

  // Note: do not set the active_at undefined as this would make that conversation not synced with the libsession wrapper
  await conversationToDecline.setIsApproved(false, false);
  await conversationToDecline.setDidApproveMe(false, false);

  if (conversationToDecline.isClosedGroupV2()) {
    // this can only be done for groupv2 convos
    await conversationToDecline.setOriginConversationID('', false);
  }
  // this will update the value in the wrapper if needed but not remove the entry if we want it gone. The remove is done below with removeContactFromWrapper
  await conversationToDecline.commit();
  if (alsoBlock) {
    if (PubKey.is03Pubkey(conversationId)) {
      // Note: if we do want to block this convo, we actually want to block the person who invited us, not the 03 pubkey itself
      if (conversationIdOrigin && !PubKey.is03Pubkey(conversationIdOrigin)) {
        // restoring from seed we can be missing the conversationIdOrigin, so we wouldn't be able to block the person who invited us

        await blockConvoById(conversationIdOrigin);
      }
    } else {
      await blockConvoById(conversationId);
    }
  }
  // when removing a message request, without blocking it, we actually have no need to store the conversation in the wrapper. So just remove the entry

  if (
    conversationToDecline.isPrivate() &&
    !SessionUtilContact.isContactToStoreInWrapper(conversationToDecline)
  ) {
    await SessionUtilContact.removeContactFromWrapper(conversationToDecline.id);
  }

  if (PubKey.is03Pubkey(conversationId)) {
    await UserGroupsWrapperActions.eraseGroup(conversationId);
  }

  if (syncToDevices) {
    await forceSyncConfigurationNowIfNeeded();
  }
  if (currentlySelectedConvo && currentlySelectedConvo === conversationId) {
    window?.inboxStore?.dispatch(resetConversationExternal());
  }
}

export const declineConversationWithConfirm = ({
  conversationId,
  syncToDevices,
  alsoBlock,
  currentlySelectedConvo,
  conversationIdOrigin,
}: {
  conversationId: string;
  currentlySelectedConvo: string | undefined;
  syncToDevices: boolean;
  alsoBlock: boolean;
  conversationIdOrigin: string | null;
}) => {
  const isGroupV2 = PubKey.is03Pubkey(conversationId);

  const okKey: LocalizerKeys = alsoBlock ? 'block' : 'delete';
  const nameToBlock =
    alsoBlock && !!conversationIdOrigin
      ? ConvoHub.use().get(conversationIdOrigin)?.getContactProfileNameOrShortenedPubKey()
      : null;
  const messageKey: LocalizerKeys = isGroupV2
    ? alsoBlock && nameToBlock
      ? 'deleteGroupRequestAndBlock'
      : 'deleteGroupRequest'
    : 'declineRequestMessage';

  let message = '';
  // restoring from seeed we might not have the sender of that invite, so we need to take care of not having one (and not block)
  if (isGroupV2 && messageKey === 'deleteGroupRequestAndBlock') {
    if (!nameToBlock) {
      throw new Error(
        'deleteGroupRequestAndBlock needs a nameToBlock (or block should not be visible)'
      );
    }

    message = window.i18n(
      messageKey,
      messageKey === 'deleteGroupRequestAndBlock' ? [nameToBlock] : []
    );
  } else {
    message = window.i18n(messageKey);
  }

  window?.inboxStore?.dispatch(
    updateConfirmModal({
      okText: window.i18n(okKey),
      cancelText: window.i18n('cancel'),
      title: window.i18n(okKey),
      message,
      okTheme: SessionButtonColor.Danger,
      closeTheme: SessionButtonColor.Primary,
      onClickOk: async () => {
        await declineConversationWithoutConfirm({
          conversationId,
          currentlySelectedConvo,
          alsoBlock,
          syncToDevices,
          conversationIdOrigin,
        });
      },
      onClickCancel: () => {
        window?.inboxStore?.dispatch(updateConfirmModal(null));
      },
      onClickClose: () => {
        window?.inboxStore?.dispatch(updateConfirmModal(null));
      },
    })
  );
};

export async function showUpdateGroupNameByConvoId(conversationId: string) {
  const conversation = ConvoHub.use().get(conversationId);
  if (conversation.isClosedGroup()) {
    // make sure all the members' convo exists so we can add or remove them
    await Promise.all(
      conversation
        .getGroupMembers()
        .map(m => ConvoHub.use().getOrCreateAndWait(m, ConversationTypeEnum.PRIVATE))
    );
  }
  window.inboxStore?.dispatch(updateGroupNameModal({ conversationId }));
}

export async function showUpdateGroupMembersByConvoId(conversationId: string) {
  const conversation = ConvoHub.use().get(conversationId);
  if (conversation.isClosedGroup()) {
    // make sure all the members' convo exists so we can add or remove them
    await Promise.all(
      conversation
        .getGroupMembers()
        .map(m => ConvoHub.use().getOrCreateAndWait(m, ConversationTypeEnum.PRIVATE))
    );
  }
  window.inboxStore?.dispatch(updateGroupMembersModal({ conversationId }));
}

export function showLeavePrivateConversationbyConvoId(
  conversationId: string,
  name: string | undefined
) {
  const conversation = ConvoHub.use().get(conversationId);
  const isMe = conversation.isMe();

  if (!conversation.isPrivate()) {
    throw new Error('showLeavePrivateConversationDialog() called with a non private convo.');
  }

  const onClickClose = () => {
    window?.inboxStore?.dispatch(updateConfirmModal(null));
  };

  const onClickOk = async () => {
    try {
      await updateConversationInteractionState({
        conversationId,
        type: isMe ? ConversationInteractionType.Hide : ConversationInteractionType.Leave,
        status: ConversationInteractionStatus.Start,
      });
      onClickClose();
      await ConvoHub.use().delete1o1(conversationId, {
        fromSyncMessage: false,
        justHidePrivate: true,
        keepMessages: isMe,
      });
      await clearConversationInteractionState({ conversationId });
    } catch (err) {
      window.log.warn(`showLeavePrivateConversationbyConvoId error: ${err}`);
      await saveConversationInteractionErrorAsMessage({
        conversationId,
        interactionType: isMe
          ? ConversationInteractionType.Hide
          : ConversationInteractionType.Leave,
      });
    }
  };

  window?.inboxStore?.dispatch(
    updateConfirmModal({
      title: isMe ? window.i18n('hideConversation') : window.i18n('deleteConversation'),
      message: isMe
        ? window.i18n('hideNoteToSelfConfirmation')
        : window.i18n('deleteConversationConfirmation', name ? [name] : ['']),
      onClickOk,
      okText: isMe ? window.i18n('hide') : window.i18n('delete'),
      okTheme: SessionButtonColor.Danger,
      onClickClose,
      conversationId,
    })
  );
}

async function leaveGroupOrCommunityByConvoId({
  conversationId,
  sendLeaveMessage,
  isPublic,
  onClickClose,
}: {
  conversationId: string;
  isPublic: boolean;
  sendLeaveMessage: boolean;
  onClickClose?: () => void;
}) {
  try {
    if (onClickClose) {
      onClickClose();
    }

    if (isPublic) {
      await ConvoHub.use().deleteCommunity(conversationId, {
        fromSyncMessage: false,
      });
      return;
    }
    // for groups, we have a "leaving..." state that we don't need for communities.
    // that's because communities can be left always, whereas for groups we need to send a leave message (and so have some encryption keypairs)
    await updateConversationInteractionState({
      conversationId,
      type: ConversationInteractionType.Leave,
      status: ConversationInteractionStatus.Start,
    });

    if (PubKey.is05Pubkey(conversationId)) {
      await ConvoHub.use().deleteLegacyGroup(conversationId, {
        fromSyncMessage: false,
        sendLeaveMessage,
      });
    } else if (PubKey.is03Pubkey(conversationId)) {
      await ConvoHub.use().deleteGroup(conversationId, {
        fromSyncMessage: false,
        sendLeaveMessage,
        deleteAllMessagesOnSwarm: false,
        emptyGroupButKeepAsKicked: false,
        forceDestroyForAllMembers: false,
      });
    }
    await clearConversationInteractionState({ conversationId });
  } catch (err) {
    window.log.warn(`showLeaveGroupByConvoId error: ${err}`);
    await saveConversationInteractionErrorAsMessage({
      conversationId,
      interactionType: ConversationInteractionType.Leave,
    });
  }
}

export async function showLeaveGroupByConvoId(conversationId: string, name: string | undefined) {
  const conversation = ConvoHub.use().get(conversationId);

  if (!conversation.isGroup()) {
    throw new Error('showLeaveGroupDialog() called with a non group convo.');
  }

  const isClosedGroup = conversation.isClosedGroup() || false;
  const isPublic = conversation.isPublic() || false;
  const admins = conversation.getGroupAdmins();
  const isAdmin = admins.includes(UserUtils.getOurPubKeyStrFromCache());
  const showOnlyGroupAdminWarning = isClosedGroup && isAdmin;
  const lastMessageInteractionType = conversation.get('lastMessageInteractionType');
  const lastMessageInteractionStatus = conversation.get('lastMessageInteractionStatus');

  if (
    !isPublic &&
    lastMessageInteractionType === ConversationInteractionType.Leave &&
    lastMessageInteractionStatus === ConversationInteractionStatus.Error
  ) {
    await leaveGroupOrCommunityByConvoId({ conversationId, isPublic, sendLeaveMessage: false });
    return;
  }

  // if this is a community, or we legacy group are not admin, we can just show a confirmation dialog

  const onClickClose = () => {
    window?.inboxStore?.dispatch(updateConfirmModal(null));
  };

  const onClickOk = async () => {
    await leaveGroupOrCommunityByConvoId({
      conversationId,
      isPublic,
      sendLeaveMessage: true,
      onClickClose,
    });
  };

  if (showOnlyGroupAdminWarning) {
    // NOTE For legacy closed groups
    window?.inboxStore?.dispatch(
      updateConfirmModal({
        title: window.i18n('leaveGroup'),
        message: window.i18n('leaveGroupConfirmationOnlyAdminLegacy', [
          name || window.i18n('unknown'),
        ]),
        onClickOk,
        okText: window.i18n('leave'),
        okTheme: SessionButtonColor.Danger,
        onClickClose,
        conversationId,
      })
    );
    // TODO this is post release chunk3 stuff: Only to be used after the closed group rebuild chunk3
    // const onClickOkLastAdmin = () => {
    //   /* TODO */
    // };
    // const onClickCloseLastAdmin = () => {
    //   /* TODO */
    // };
    // window?.inboxStore?.dispatch(
    //   updateConfirmModal({
    //     title: window.i18n('leaveGroup'),
    //     message: window.i18n('leaveGroupConfirmationOnlyAdmin', name ? [name] : ['']),
    //     messageSub: window.i18n('leaveGroupConfirmationOnlyAdminWarning'),
    //     onClickOk: onClickOkLastAdmin,
    //     okText: window.i18n('addModerator'),
    //     cancelText: window.i18n('leave'),
    //     onClickCancel: onClickCloseLastAdmin,
    //     closeTheme: SessionButtonColor.Danger,
    //     onClickClose,
    //     showExitIcon: true,
    //     headerReverse: true,
    //     conversationId,
    //   })
    // );
  } else if (isPublic || (isClosedGroup && !isAdmin)) {
    window?.inboxStore?.dispatch(
      updateConfirmModal({
        title: isPublic ? window.i18n('leaveCommunity') : window.i18n('leaveGroup'),
        message: window.i18n('leaveGroupConfirmation', name ? [name] : ['']),
        onClickOk,
        okText: window.i18n('leave'),
        okTheme: SessionButtonColor.Danger,
        onClickClose,
        conversationId,
      })
    );
  }
}

export function showInviteContactByConvoId(conversationId: string) {
  window.inboxStore?.dispatch(updateInviteContactModal({ conversationId }));
}

export function showAddModeratorsByConvoId(conversationId: string) {
  window.inboxStore?.dispatch(updateAddModeratorsModal({ conversationId }));
}

export function showRemoveModeratorsByConvoId(conversationId: string) {
  window.inboxStore?.dispatch(updateRemoveModeratorsModal({ conversationId }));
}

export function showBanUserByConvoId(conversationId: string, pubkey?: string) {
  window.inboxStore?.dispatch(
    updateBanOrUnbanUserModal({ banType: 'ban', conversationId, pubkey })
  );
}

export function showUnbanUserByConvoId(conversationId: string, pubkey?: string) {
  window.inboxStore?.dispatch(
    updateBanOrUnbanUserModal({ banType: 'unban', conversationId, pubkey })
  );
}

export async function markAllReadByConvoId(conversationId: string) {
  const conversation = ConvoHub.use().get(conversationId);
  perfStart(`markAllReadByConvoId-${conversationId}`);

  await conversation?.markAllAsRead();

  perfEnd(`markAllReadByConvoId-${conversationId}`, 'markAllReadByConvoId');
}

export async function setNotificationForConvoId(
  conversationId: string,
  selected: ConversationNotificationSettingType
) {
  const conversation = ConvoHub.use().get(conversationId);

  const existingSettings = conversation.getNotificationsFor();
  if (existingSettings !== selected) {
    conversation.set({ triggerNotificationsFor: selected });
    await conversation.commit();
  }
}
export async function clearNickNameByConvoId(conversationId: string) {
  const conversation = ConvoHub.use().get(conversationId);
  await conversation.setNickname(null, true);
}

export function showChangeNickNameByConvoId(conversationId: string) {
  window.inboxStore?.dispatch(changeNickNameModal({ conversationId }));
}

export async function deleteAllMessagesByConvoIdNoConfirmation(conversationId: string) {
  const conversation = ConvoHub.use().get(conversationId);
  await Data.removeAllMessagesInConversation(conversationId);

  // destroy message keeps the active timestamp set so the
  // conversation still appears on the conversation list but is empty
  conversation.set({
    lastMessage: null,
    lastMessageInteractionType: null,
    lastMessageInteractionStatus: null,
  });

  await conversation.commit();
  window.inboxStore?.dispatch(conversationReset(conversationId));
}

export function deleteAllMessagesByConvoIdWithConfirmation(conversationId: string) {
  const onClickClose = () => {
    window?.inboxStore?.dispatch(updateConfirmModal(null));
  };

  const onClickOk = async () => {
    await deleteAllMessagesByConvoIdNoConfirmation(conversationId);
    onClickClose();
  };

  window?.inboxStore?.dispatch(
    updateConfirmModal({
      title: window.i18n('deleteMessages'),
      message: window.i18n('deleteMessagesConfirmation'),
      onClickOk,
      okTheme: SessionButtonColor.Danger,
      onClickClose,
    })
  );
}

export async function setDisappearingMessagesByConvoId(
  conversationId: string,
  expirationMode: DisappearingMessageConversationModeType,
  seconds?: number
) {
  const conversation = ConvoHub.use().get(conversationId);

  const canSetDisappearing = !conversation.isOutgoingRequest() && !conversation.isIncomingRequest();

  if (!canSetDisappearing) {
    ToastUtils.pushMustBeApproved();
    return;
  }

  if (!expirationMode || expirationMode === 'off' || !seconds || seconds <= 0) {
    await conversation.updateExpireTimer({
      providedDisappearingMode: 'off',
      providedExpireTimer: 0,
      fromSync: false,
      fromCurrentDevice: true,
      fromConfigMessage: false,
    });
  } else {
    await conversation.updateExpireTimer({
      providedDisappearingMode: expirationMode,
      providedExpireTimer: seconds,
      fromSync: false,
      fromCurrentDevice: true,
      fromConfigMessage: false,
    });
  }
}

/**
 * This function can be used for reupload our avatar to the fileserver or upload a new avatar.
 *
 * If this is a reupload, the old profileKey is used, otherwise a new one is generated
 */
export async function uploadOurAvatar(newAvatarDecrypted?: ArrayBuffer) {
  const ourConvo = ConvoHub.use().get(UserUtils.getOurPubKeyStrFromCache());
  if (!ourConvo) {
    window.log.warn('ourConvo not found... This is not a valid case');
    return null;
  }

  let profileKey: Uint8Array | null;
  let decryptedAvatarData;
  if (newAvatarDecrypted) {
    // Encrypt with a new key every time
    profileKey = (await getSodiumRenderer()).randombytes_buf(32);
    decryptedAvatarData = newAvatarDecrypted;
  } else {
    // this is a reupload. no need to generate a new profileKey
    const ourConvoProfileKey =
      ConvoHub.use().get(UserUtils.getOurPubKeyStrFromCache())?.getProfileKey() || null;

    profileKey = ourConvoProfileKey ? fromHexToArray(ourConvoProfileKey) : null;
    if (!profileKey) {
      window.log.info('our profileKey not found. Not reuploading our avatar');
      return null;
    }
    const currentAttachmentPath = ourConvo.getAvatarPath();

    if (!currentAttachmentPath) {
      window.log.warn('No attachment currently set for our convo.. Nothing to do.');
      return null;
    }

    const decryptedAvatarUrl = await DecryptedAttachmentsManager.getDecryptedMediaUrl(
      currentAttachmentPath,
      IMAGE_JPEG,
      true
    );

    if (!decryptedAvatarUrl) {
      window.log.warn('Could not decrypt avatar stored locally..');
      return null;
    }
    const blob = await urlToBlob(decryptedAvatarUrl);

    decryptedAvatarData = await blob.arrayBuffer();
  }

  if (!decryptedAvatarData?.byteLength) {
    window.log.warn('Could not read content of avatar ...');
    return null;
  }

  const encryptedData = await encryptProfile(decryptedAvatarData, profileKey);

  const avatarPointer = await uploadFileToFsWithOnionV4(encryptedData);
  if (!avatarPointer) {
    window.log.warn('failed to upload avatar to fileserver');
    return null;
  }
  const { fileUrl, fileId } = avatarPointer;

  ourConvo.set('avatarPointer', fileUrl);

  // this encrypts and save the new avatar and returns a new attachment path
  const upgraded = await processNewAttachment({
    isRaw: true,
    data: decryptedAvatarData,
    contentType: MIME.IMAGE_UNKNOWN, // contentType is mostly used to generate previews and screenshot. We do not care for those in this case.
  });
  // Replace our temporary image with the attachment pointer from the server:
  ourConvo.set('avatarInProfile', undefined);
  const displayName = ourConvo.getRealSessionUsername();

  // write the profileKey even if it did not change
  ourConvo.set({ profileKey: toHex(profileKey) });
  // Replace our temporary image with the attachment pointer from the server:
  // this commits already
  await ourConvo.setSessionProfile({
    avatarPath: upgraded.path,
    displayName,
    avatarImageId: fileId,
  });
  const newTimestampReupload = Date.now();
  await Storage.put(SettingsKey.lastAvatarUploadTimestamp, newTimestampReupload);

  if (newAvatarDecrypted) {
    await setLastProfileUpdateTimestamp(Date.now());
    await UserSync.queueNewJobIfNeeded();
    const userConfigLibsession = await ReleasedFeatures.checkIsUserConfigFeatureReleased();

    if (!userConfigLibsession) {
      await SyncUtils.forceSyncConfigurationNowIfNeeded(true);
    }
  } else {
    window.log.info(
      `Reuploading avatar finished at ${newTimestampReupload}, newAttachmentPointer ${fileUrl}`
    );
  }
  return {
    avatarPointer: ourConvo.getAvatarPointer(),
    profileKey: ourConvo.getProfileKey(),
  };
}

/**
 * This function can be used for clearing our avatar.
 */
export async function clearOurAvatar(commit: boolean = true) {
  const ourConvo = ConvoHub.use().get(UserUtils.getOurPubKeyStrFromCache());
  if (!ourConvo) {
    window.log.warn('ourConvo not found... This is not a valid case');
    return;
  }

  // return early if no change are needed at all
  if (
    isNil(ourConvo.get('avatarPointer')) &&
    isNil(ourConvo.get('avatarInProfile')) &&
    isNil(ourConvo.get('profileKey'))
  ) {
    return;
  }

  ourConvo.set('avatarPointer', undefined);
  ourConvo.set('avatarInProfile', undefined);
  ourConvo.set('profileKey', undefined);

  await setLastProfileUpdateTimestamp(Date.now());

  if (commit) {
    await ourConvo.commit();
    await SyncUtils.forceSyncConfigurationNowIfNeeded(true);
  }
}

export async function replyToMessage(messageId: string) {
  const quotedMessageModel = await Data.getMessageById(messageId);
  if (!quotedMessageModel) {
    window.log.warn('Failed to find message to reply to');
    return false;
  }
  const conversationModel = ConvoHub.use().getOrThrow(quotedMessageModel.get('conversationId'));

  const quotedMessageProps = await conversationModel.makeQuote(quotedMessageModel);

  if (quotedMessageProps) {
    window.inboxStore?.dispatch(quoteMessage(quotedMessageProps));
  } else {
    window.inboxStore?.dispatch(quoteMessage(undefined));
  }

  return true;
}

export async function resendMessage(messageId: string) {
  const foundMessageModel = await Data.getMessageById(messageId);

  if (!foundMessageModel) {
    window.log.warn('Failed to find message to resend');
    return false;
  }

  await foundMessageModel.retrySend();
  return true;
}

/**
 * Check if what is pasted is a URL and prompt confirmation for a setting change
 * @param e paste event
 */
export async function showLinkSharingConfirmationModalDialog(e: any) {
  const pastedText = e.clipboardData.getData('text');
  if (isURL(pastedText) && !window.getSettingValue(SettingsKey.settingsLinkPreview, false)) {
    const alreadyDisplayedPopup =
      (await Data.getItemById(SettingsKey.hasLinkPreviewPopupBeenDisplayed))?.value || false;
    if (!alreadyDisplayedPopup) {
      window.inboxStore?.dispatch(
        updateConfirmModal({
          shouldShowConfirm:
            !window.getSettingValue(SettingsKey.settingsLinkPreview) && !alreadyDisplayedPopup,
          title: window.i18n('linkPreviewsTitle'),
          message: window.i18n('linkPreviewsConfirmMessage'),
          okTheme: SessionButtonColor.Danger,
          onClickOk: async () => {
            await window.setSettingValue(SettingsKey.settingsLinkPreview, true);
          },
          onClickClose: async () => {
            await Storage.put(SettingsKey.hasLinkPreviewPopupBeenDisplayed, true);
          },
        })
      );
    }
  }
}

/**
 *
 * @param str String to evaluate
 * @returns boolean if the string is true or false
 */
function isURL(str: string) {
  const urlRegex =
    '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  const url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
}

export async function callRecipient(pubkey: string, canCall: boolean) {
  const convo = ConvoHub.use().get(pubkey);

  if (!canCall) {
    ToastUtils.pushUnableToCall();
    return;
  }

  if (!getCallMediaPermissionsSettings()) {
    ToastUtils.pushVideoCallPermissionNeeded();
    return;
  }

  if (convo && convo.isPrivate() && !convo.isMe()) {
    await CallManager.USER_callRecipient(convo.id);
  }
}

/**
 * Updates the interaction state for a conversation. Remember to run clearConversationInteractionState() when the interaction is complete and we don't want to show it in the UI anymore.
 * @param conversationId id of the converation we want to interact with
 * @param type the type of conversation interaciton we are doing
 * @param status the status of that interaction
 */
export async function updateConversationInteractionState({
  conversationId,
  type,
  status,
}: {
  conversationId: string;
  type: ConversationInteractionType;
  status: ConversationInteractionStatus;
}) {
  const convo = ConvoHub.use().get(conversationId);
  if (
    convo &&
    (type !== convo.get('lastMessageInteractionType') ||
      status !== convo.get('lastMessageInteractionStatus'))
  ) {
    convo.set('lastMessageInteractionType', type);
    convo.set('lastMessageInteractionStatus', status);

    await convo.commit();
    window.log.debug(
      `updateConversationInteractionState for ${conversationId} to ${type} ${status}`
    );
  }
}

/**
 * Clears the interaction state for a conversation. We would use this when we don't need to show anything in the UI once an action is complete.
 * @param conversationId id of the conversation whose interaction we want to clear
 */
export async function clearConversationInteractionState({
  conversationId,
}: {
  conversationId: string;
}) {
  const convo = ConvoHub.use().get(conversationId);
  if (
    convo &&
    (convo.get('lastMessageInteractionType') || convo.get('lastMessageInteractionStatus'))
  ) {
    convo.set('lastMessageInteractionType', undefined);
    convo.set('lastMessageInteractionStatus', undefined);

    await convo.commit();
    window.log.debug(`clearConversationInteractionState for ${conversationId}`);
  }
}

async function saveConversationInteractionErrorAsMessage({
  conversationId,
  interactionType,
}: {
  conversationId: string;
  interactionType: ConversationInteractionType;
}) {
  const conversation = ConvoHub.use().get(conversationId);
  if (!conversation) {
    return;
  }

  const interactionStatus = ConversationInteractionStatus.Error;

  await updateConversationInteractionState({
    conversationId,
    type: interactionType,
    status: interactionStatus,
  });

  // NOTE at this time we don't have visible control messages in communities
  if (conversation.isPublic()) {
    return;
  }

  // Add an error message to the database so we can view it in the message history
  await conversation?.addSingleIncomingMessage({
    source: GetNetworkTime.now().toString(),
    sent_at: Date.now(),
    interactionNotification: {
      interactionType,
      interactionStatus,
    },
    unread: READ_MESSAGE_STATE.read,
    expireTimer: 0,
  });

  conversation.updateLastMessage();
}
