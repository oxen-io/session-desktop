import { toast } from 'react-toastify';
import { SessionToast, SessionToastType } from '../../components/basic/SessionToast';
import { SectionType, showLeftPaneSection, showSettingsSection } from '../../state/ducks/section';

// if you push a toast manually with toast...() be sure to set the type attribute of the SessionToast component
export function pushToastError(id: string, title: string, description?: string) {
  toast.error(
    <SessionToast title={title} description={description} type={SessionToastType.Error} />,
    { toastId: id, updateId: id }
  );
}

export function pushToastWarning(id: string, title: string, description?: string) {
  toast.warning(
    <SessionToast title={title} description={description} type={SessionToastType.Warning} />,
    { toastId: id, updateId: id }
  );
}

export function pushToastInfo(
  id: string,
  title: string,
  description?: string,
  onToastClick?: () => void,
  delay?: number
) {
  toast.info(
    <SessionToast
      title={title}
      description={description}
      type={SessionToastType.Info}
      onToastClick={onToastClick}
    />,
    { toastId: id, updateId: id, delay }
  );
}

export function pushToastSuccess(id: string, title: string, description?: string) {
  toast.success(
    <SessionToast title={title} description={description} type={SessionToastType.Success} />,
    { toastId: id, updateId: id }
  );
}

export function pushLoadAttachmentFailure(message?: string) {
  if (message) {
    pushToastError(
      'unableToLoadAttachment',
      `${window.i18n.stripped('attachmentsErrorLoad')} ${message}`
    );
  } else {
    pushToastError('unableToLoadAttachment', window.i18n.stripped('attachmentsErrorLoad'));
  }
}

export function pushFileSizeErrorAsByte() {
  pushToastError('fileSizeWarning', window.i18n.stripped('attachmentsErrorSize'));
}

export function pushMultipleNonImageError() {
  pushToastError('attachmentsErrorTypes', window.i18n.stripped('attachmentsErrorTypes'));
}

export function pushCannotMixError() {
  pushToastError('attachmentsErrorTypes', window.i18n.stripped('attachmentsErrorTypes'));
}

export function pushMaximumAttachmentsError() {
  pushToastError('attachmentsErrorNumber', window.i18n.stripped('attachmentsErrorNumber'));
}

export function pushCopiedToClipBoard() {
  pushToastInfo('copiedToClipboard', window.i18n.stripped('copied'));
}

export function pushRestartNeeded() {
  pushToastInfo('restartNeeded', window.i18n.stripped('settingsRestartDescription'));
}

export function pushAlreadyMemberOpenGroup() {
  pushToastInfo('publicChatExists', window.i18n.stripped('communityJoinedAlready'));
}

export function pushUserBanSuccess() {
  pushToastSuccess('userBanned', window.i18n.stripped('banUserBanned'));
}

export function pushUserBanFailure() {
  pushToastError('userBanFailed', window.i18n.stripped('banErrorFailed'));
}

export function pushUserUnbanSuccess() {
  pushToastSuccess('userUnbanned', window.i18n.stripped('banUnbanUserUnbanned'));
}

export function pushUserUnbanFailure() {
  pushToastError('userUnbanFailed', window.i18n.stripped('banUnbanErrorFailed'));
}

export function pushMessageDeleteForbidden() {
  pushToastError(
    'messageDeletionForbidden',
    window.i18n.stripped('deleteafterMessageDeletionStandardisationmessageDeletionForbidden')
  );
}

export function pushUnableToCall() {
  pushToastError('unableToCall', window.i18n.stripped('callsCannotStart'));
}

export function pushedMissedCall(userName: string) {
  pushToastInfo('missedCall', window.i18n.stripped('callsMissedCallFrom', { name: userName }));
}

const openPermissionsSettings = () => {
  window.inboxStore?.dispatch(showLeftPaneSection(SectionType.Settings));
  window.inboxStore?.dispatch(showSettingsSection('permissions'));
};

export function pushedMissedCallCauseOfPermission(conversationName: string) {
  const id = 'missedCallPermission';
  toast.info(
    <SessionToast
      title={window.i18n.stripped('callsMissedCallFrom', { name: conversationName })}
      description={window.i18n.stripped('callsYouMissedCallPermissions', {
        name: conversationName,
      })}
      type={SessionToastType.Info}
      onToastClick={openPermissionsSettings}
    />,
    { toastId: id, updateId: id, autoClose: 10000 }
  );
}

export function pushVideoCallPermissionNeeded() {
  pushToastInfo(
    'videoCallPermissionNeeded',
    window.i18n.stripped('callsPermissionsRequired'),
    window.i18n.stripped('callsPermissionsRequiredDescription'),
    openPermissionsSettings
  );
}

export function pushAudioPermissionNeeded() {
  pushToastInfo(
    'audioPermissionNeeded',
    window.i18n.stripped('permissionsMicrophoneAccessRequiredDesktop'),
    undefined,
    openPermissionsSettings
  );
}

export function pushOriginalNotFound() {
  pushToastError('messageErrorOriginal', window.i18n.stripped('messageErrorOriginal'));
}

export function pushTooManyMembers() {
  pushToastError('groupAddMemberMaximum', window.i18n.stripped('groupAddMemberMaximum'));
}

export function pushMessageRequestPending() {
  pushToastInfo('messageRequestPending', window.i18n.stripped('messageRequestPending'));
}

export function pushUnblockToSend() {
  pushToastInfo('unblockToSend', window.i18n.stripped('blockBlockedDescription'));
}

export function pushYouLeftTheGroup() {
  pushToastError('youLeftTheGroup', window.i18n.stripped('groupMemberYouLeft'));
}

export function someDeletionsFailed(count: number) {
  pushToastWarning('deletionError', window.i18n.stripped('deleteMessagesFailed', { count }));
}

export function pushDeleted() {
  pushToastSuccess('deleted', window.i18n.stripped('deleteMessagesDeleted'), undefined);
}

export function pushCannotRemoveCreatorFromGroup() {
  pushToastWarning('adminCannotBeRemoved', window.i18n.stripped('adminCannotBeRemoved'));
}

export function pushFailedToAddAsModerator() {
  pushToastWarning('adminPromotionFailed', window.i18n.stripped('adminPromotionFailed'));
}

export function pushFailedToRemoveFromModerator(names: Array<string>) {
  let localizedString: string = '';
  switch (names.length) {
    case 0:
      throw new Error('pushFailedToRemoveFromModerator invalid case error');
    case 1:
      localizedString = window.i18n.stripped('adminRemoveFailed', {
        name: names[0],
      });
      break;
    case 2:
      localizedString = window.i18n.stripped('adminRemoveFailedOther', {
        name: names[0],
        other_name: names[1],
      });
      break;
    default:
      localizedString = window.i18n.stripped('adminRemoveFailedMultiple', {
        name: names[0],
        count: names.length - 1,
      });
      break;
  }
  pushToastWarning('adminRemoveFailed', localizedString);
}

export function pushUserAddedToModerators(name: string) {
  pushToastSuccess('adminPromotedToAdmin', window.i18n.stripped('adminPromotedToAdmin', { name }));
}

export function pushUserRemovedFromModerators(names: Array<string>) {
  let localizedString: string = '';
  switch (names.length) {
    case 0:
      throw new Error('pushUserRemovedFromModerators invalid case error');
    case 1:
      localizedString = window.i18n.stripped('adminRemovedUser', {
        name: names[0],
      });
      break;
    case 2:
      localizedString = window.i18n.stripped('adminRemovedUserOther', {
        name: names[0],
        other_name: names[1],
      });
      break;
    default:
      localizedString = window.i18n.stripped('adminRemovedUserMultiple', {
        name: names[0],
        count: names.length - 1,
      });
      break;
  }

  pushToastSuccess('adminRemovedUser', localizedString);
}

export function pushInvalidPubKey() {
  pushToastSuccess('accountIdErrorInvalid', window.i18n.stripped('accountIdErrorInvalid'));
}

export function pushNoCameraFound() {
  pushToastWarning('noCameraFound', window.i18n.stripped('cameraErrorNotFound'));
}

export function pushNoAudioInputFound() {
  pushToastWarning('noAudioInputFound', window.i18n.stripped('audioNoInput'));
}

export function pushNoAudioOutputFound() {
  pushToastWarning('noAudioOutputFound', window.i18n.stripped('audioNoOutput'));
}

export function pushNoMediaUntilApproved() {
  pushToastError('noMediaUntilApproved', window.i18n.stripped('messageRequestPendingDescription'));
}

export function pushRateLimitHitReactions() {
  pushToastInfo('reactRateLimit', '', window?.i18n?.('emojiReactsCoolDown')); // because otherwise test fails
}
