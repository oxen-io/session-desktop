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
    pushToastError('unableToLoadAttachment', `${window.i18n('attachmentsErrorLoad')} ${message}`);
  } else {
    pushToastError('unableToLoadAttachment', window.i18n('attachmentsErrorLoad'));
  }
}

export function pushFileSizeError(limit: number, units: string) {
  pushToastError(
    'fileSizeWarning',
    window.i18n('attachmentsErrorSize'),
    `Max size: ${limit} ${units}`
  );
}

export function pushFileSizeErrorAsByte(bytesCount: number) {
  const units = ['kB', 'MB', 'GB'];
  let u = -1;
  let limit = bytesCount;
  do {
    limit /= 1000;
    u += 1;
  } while (limit >= 1000 && u < units.length - 1);
  pushFileSizeError(limit, units[u]);
}

export function pushMultipleNonImageError() {
  pushToastError('cannotMixImageAndNonImageAttachments', window.i18n('attachmentsErrorTypes'));
}

export function pushCannotMixError() {
  pushToastError('oneNonImageAtATimeToast', window.i18n('attachmentsErrorTypes'));
}

export function pushMaximumAttachmentsError() {
  pushToastError('maximumAttachments', window.i18n('attachmentsErrorNumber'));
}

export function pushMessageBodyMissing() {
  // TODO: String localization - remove
  pushToastError('messageBodyMissing', window.i18n('messageBodyMissing'));
}

export function pushCopiedToClipBoard() {
  pushToastInfo('copiedToClipboard', window.i18n('copied'));
}

export function pushRestartNeeded() {
  pushToastInfo('restartNeeded', window.i18n('settingsRestartDescription'));
}

export function pushAlreadyMemberOpenGroup() {
  pushToastInfo('publicChatExists', window.i18n('communityJoinedAlready'));
}

export function pushUserBanSuccess() {
  pushToastSuccess('userBanned', window.i18n('banUserBanned'));
}

export function pushUserBanFailure() {
  pushToastError('userBanFailed', window.i18n('banErrorFailed'));
}

export function pushUserUnbanSuccess() {
  pushToastSuccess('userUnbanned', window.i18n('userUnbanned'));
}

export function pushUserUnbanFailure() {
  pushToastError('userUnbanFailed', window.i18n('banUnbanErrorFailed'));
}

export function pushMessageDeleteForbidden() {
  pushToastError('messageDeletionForbidden', window.i18n('messageDeletionForbidden'));
}

export function pushUnableToCall() {
  pushToastError('unableToCall', window.i18n('callsCannotStart'), window.i18n('callsCannotStart'));
}

export function pushedMissedCall(conversationName: string) {
  pushToastInfo('missedCall', window.i18n('callsMissedCallFrom', { name: conversationName }));
}

const openPermissionsSettings = () => {
  window.inboxStore?.dispatch(showLeftPaneSection(SectionType.Settings));
  window.inboxStore?.dispatch(showSettingsSection('permissions'));
};

export function pushedMissedCallCauseOfPermission(conversationName: string) {
  const id = 'missedCallPermission';
  toast.info(
    <SessionToast
      title={window.i18n('callsMissedCallFrom', { name: conversationName })}
      description={window.i18n('callsYouMissedCallPermissions', { name: conversationName })}
      type={SessionToastType.Info}
      onToastClick={openPermissionsSettings}
    />,
    { toastId: id, updateId: id, autoClose: 10000 }
  );
}

export function pushedMissedCallNotApproved(name: string) {
  pushToastInfo('missedCall', window.i18n('callsMissedCallFrom', { name }));
}

export function pushVideoCallPermissionNeeded() {
  pushToastInfo(
    'videoCallPermissionNeeded',
    window.i18n('callsPermissionsRequired'),
    window.i18n('callsPermissionsRequiredDescription'),
    openPermissionsSettings
  );
}

export function pushAudioPermissionNeeded() {
  pushToastInfo(
    'audioPermissionNeeded',
    window.i18n('permissionsMicrophoneAccessRequired'),
    window.i18n('permissionsMicrophoneAccessRequiredDesktop'),
    openPermissionsSettings
  );
}

export function pushOriginalNotFound() {
  pushToastError('originalMessageNotFound', window.i18n('messageErrorOriginal'));
}

export function pushTooManyMembers() {
  pushToastError('tooManyMembers', window.i18n('groupAddMemberMaximum'));
}

export function pushMessageRequestPending() {
  pushToastInfo('messageRequestPending', window.i18n('messageRequestPending'));
}

export function pushUnblockToSend() {
  pushToastInfo('unblockToSend', window.i18n('blockBlockedDescription'));
}

export function pushYouLeftTheGroup() {
  pushToastError('youLeftTheGroup', window.i18n('groupMemberYouLeft'));
}

export function someDeletionsFailed() {
  pushToastWarning('deletionError', 'Deletion error');
}

export function pushDeleted() {
  pushToastSuccess('deleted', window.i18n('deleteMessagesDeleted'), undefined, 'check');
}

export function pushCannotRemoveCreatorFromGroup() {
  pushToastWarning('cannotRemoveCreatorFromGroup', window.i18n('adminCannotBeRemoved'));
}

export function pushOnlyAdminCanRemove() {
  pushToastInfo('onlyAdminCanRemoveMembers', window.i18n('onlyAdminCanRemoveMembersDesc'));
}

export function pushFailedToAddAsModerator() {
  pushToastWarning('failedToAddAsModerator', window.i18n('failedToAddAsModerator'));
}

export function pushFailedToRemoveFromModerator() {
  pushToastWarning('failedToRemoveFromModerator', window.i18n('failedToRemoveFromModerator'));
}

export function pushUserAddedToModerators() {
  pushToastSuccess('userAddedToModerators', window.i18n('userAddedToModerators'));
}

export function pushUserRemovedFromModerators() {
  pushToastSuccess('userRemovedFromModerators', window.i18n('userRemovedFromModerators'));
}

export function pushInvalidPubKey() {
  pushToastSuccess('invalidPubKey', window.i18n('accountIdErrorInvalid'));
}

export function pushNoCameraFound() {
  pushToastWarning('noCameraFound', window.i18n('cameraErrorNotFound'));
}

export function pushNoAudioInputFound() {
  pushToastWarning('noAudioInputFound', window.i18n('audioNoInput'));
}

export function pushNoAudioOutputFound() {
  pushToastWarning('noAudioOutputFound', window.i18n('audioNoOutput'));
}

export function pushNoMediaUntilApproved() {
  pushToastError('noMediaUntilApproved', window.i18n('messageRequestPendingDescription'));
}

export function pushMustBeApproved() {
  pushToastError('mustBeApproved', window.i18n('mustBeApproved'));
}

export function pushRateLimitHitReactions() {
  pushToastInfo('reactRateLimit', '', window?.i18n?.('emojiReactsCoolDown')); // because otherwise test fails
}
