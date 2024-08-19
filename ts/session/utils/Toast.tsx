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

/**
 * We are rendering a toast. A toast is only rendering a string and no html at all.
 * We have to strip the html tags from the strings we are given.
 */
const getStrippedI18n = window.i18n.stripped;

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
      `${getStrippedI18n('attachmentsErrorLoad')} ${message}`
    );
  } else {
    pushToastError('unableToLoadAttachment', getStrippedI18n('attachmentsErrorLoad'));
  }
}

export function pushFileSizeErrorAsByte() {
  pushToastError('fileSizeWarning', getStrippedI18n('attachmentsErrorSize'));
}

export function pushMultipleNonImageError() {
  pushToastError('attachmentsErrorTypes', getStrippedI18n('attachmentsErrorTypes'));
}

export function pushCannotMixError() {
  pushToastError('attachmentsErrorTypes', getStrippedI18n('attachmentsErrorTypes'));
}

export function pushMaximumAttachmentsError() {
  pushToastError('attachmentsErrorNumber', getStrippedI18n('attachmentsErrorNumber'));
}

export function pushCopiedToClipBoard() {
  pushToastInfo('copiedToClipboard', getStrippedI18n('copied'));
}

export function pushRestartNeeded() {
  pushToastInfo('restartNeeded', getStrippedI18n('settingsRestartDescription'));
}

export function pushAlreadyMemberOpenGroup() {
  pushToastInfo('publicChatExists', getStrippedI18n('communityJoinedAlready'));
}

export function pushUserBanSuccess() {
  pushToastSuccess('userBanned', getStrippedI18n('banUserBanned'));
}

export function pushUserBanFailure() {
  pushToastError('userBanFailed', getStrippedI18n('banErrorFailed'));
}

export function pushUserUnbanSuccess() {
  pushToastSuccess('userUnbanned', getStrippedI18n('banUnbanUserUnbanned'));
}

export function pushUserUnbanFailure() {
  pushToastError('userUnbanFailed', getStrippedI18n('banUnbanErrorFailed'));
}

export function pushMessageDeleteForbidden() {
  pushToastError(
    'messageDeletionForbidden',
    getStrippedI18n('deleteafterMessageDeletionStandardisationmessageDeletionForbidden')
  );
}

export function pushUnableToCall() {
  pushToastError('unableToCall', getStrippedI18n('callsCannotStart'));
}

export function pushedMissedCall(userName: string) {
  pushToastInfo('missedCall', getStrippedI18n('callsMissedCallFrom', { name: userName }));
}

const openPermissionsSettings = () => {
  window.inboxStore?.dispatch(showLeftPaneSection(SectionType.Settings));
  window.inboxStore?.dispatch(showSettingsSection('permissions'));
};

export function pushedMissedCallCauseOfPermission(conversationName: string) {
  const id = 'missedCallPermission';
  toast.info(
    <SessionToast
      title={getStrippedI18n('callsMissedCallFrom', { name: conversationName })}
      description={getStrippedI18n('callsYouMissedCallPermissions', { name: conversationName })}
      type={SessionToastType.Info}
      onToastClick={openPermissionsSettings}
    />,
    { toastId: id, updateId: id, autoClose: 10000 }
  );
}

export function pushVideoCallPermissionNeeded() {
  pushToastInfo(
    'videoCallPermissionNeeded',
    getStrippedI18n('callsPermissionsRequired'),
    getStrippedI18n('callsPermissionsRequiredDescription'),
    openPermissionsSettings
  );
}

export function pushAudioPermissionNeeded() {
  pushToastInfo(
    'audioPermissionNeeded',
    getStrippedI18n('permissionsMicrophoneAccessRequiredDesktop'),
    undefined,
    openPermissionsSettings
  );
}

export function pushOriginalNotFound() {
  pushToastError('messageErrorOriginal', getStrippedI18n('messageErrorOriginal'));
}

export function pushTooManyMembers() {
  pushToastError('groupAddMemberMaximum', getStrippedI18n('groupAddMemberMaximum'));
}

export function pushMessageRequestPending() {
  pushToastInfo('messageRequestPending', getStrippedI18n('messageRequestPending'));
}

export function pushUnblockToSend() {
  pushToastInfo('unblockToSend', getStrippedI18n('blockBlockedDescription'));
}

export function pushYouLeftTheGroup() {
  pushToastError('youLeftTheGroup', getStrippedI18n('groupMemberYouLeft'));
}

export function someDeletionsFailed(count: number) {
  pushToastWarning('deletionError', getStrippedI18n('deleteMessagesFailed', { count }));
}

export function pushDeleted() {
  pushToastSuccess('deleted', getStrippedI18n('deleteMessagesDeleted'), undefined);
}

export function pushCannotRemoveCreatorFromGroup() {
  pushToastWarning('adminCannotBeRemoved', getStrippedI18n('adminCannotBeRemoved'));
}

export function pushFailedToAddAsModerator() {
  pushToastWarning('adminPromotionFailed', getStrippedI18n('adminPromotionFailed'));
}

export function pushFailedToRemoveFromModerator(names: Array<string>) {
  let localizedString: string = '';
  switch (names.length) {
    case 0:
      throw new Error('pushFailedToRemoveFromModerator invalid case error');
    case 1:
      localizedString = getStrippedI18n('adminRemoveFailed', {
        name: names[0],
      });
      break;
    case 2:
      localizedString = getStrippedI18n('adminRemoveFailedOther', {
        name: names[0],
        other_name: names[1],
      });
      break;
    default:
      localizedString = getStrippedI18n('adminRemoveFailedMultiple', {
        name: names[0],
        count: names.length - 1,
      });
      break;
  }
  pushToastWarning('adminRemoveFailed', localizedString);
}

export function pushUserAddedToModerators(name: string) {
  pushToastSuccess('adminPromotedToAdmin', getStrippedI18n('adminPromotedToAdmin', { name }));
}

export function pushUserRemovedFromModerators(names: Array<string>) {
  let localizedString: string = '';
  switch (names.length) {
    case 0:
      throw new Error('pushUserRemovedFromModerators invalid case error');
    case 1:
      localizedString = getStrippedI18n('adminRemovedUser', {
        name: names[0],
      });
      break;
    case 2:
      localizedString = getStrippedI18n('adminRemovedUserOther', {
        name: names[0],
        other_name: names[1],
      });
      break;
    default:
      localizedString = getStrippedI18n('adminRemovedUserMultiple', {
        name: names[0],
        count: names.length - 1,
      });
      break;
  }

  pushToastSuccess('adminRemovedUser', localizedString);
}

export function pushInvalidPubKey() {
  pushToastSuccess('accountIdErrorInvalid', getStrippedI18n('accountIdErrorInvalid'));
}

export function pushNoCameraFound() {
  pushToastWarning('noCameraFound', getStrippedI18n('cameraErrorNotFound'));
}

export function pushNoAudioInputFound() {
  pushToastWarning('noAudioInputFound', getStrippedI18n('audioNoInput'));
}

export function pushNoAudioOutputFound() {
  pushToastWarning('noAudioOutputFound', getStrippedI18n('audioNoOutput'));
}

export function pushNoMediaUntilApproved() {
  pushToastError('noMediaUntilApproved', getStrippedI18n('messageRequestPendingDescription'));
}

export function pushRateLimitHitReactions() {
  pushToastInfo('reactRateLimit', '', window?.i18n?.('emojiReactsCoolDown')); // because otherwise test fails
}
