/* eslint-disable @typescript-eslint/no-misused-promises */
import React from 'react';

import useUpdate from 'react-use/lib/useUpdate';
import { SettingsKey } from '../../../data/settings-key';
import { ConversationTypeEnum } from '../../../models/conversationAttributes';
import { updateConfirmModal } from '../../../state/ducks/modalDialog';
import { SessionButtonColor } from '../../basic/SessionButton';
import { SpacerLG } from '../../basic/Text';
import { TypingBubble } from '../../conversation/TypingBubble';

import { UserUtils } from '../../../session/utils';
import { ConfigurationSync } from '../../../session/utils/job_runners/jobs/ConfigurationSyncJob';
import { SessionUtilUserProfile } from '../../../session/utils/libsession/libsession_utils_user_profile';
import {
  useHasBlindedMsgRequestsEnabled,
  useHasLinkPreviewEnabled,
} from '../../../state/selectors/settings';
import { Storage } from '../../../util/storage';
import { SessionSettingButtonItem, SessionToggleWithDescription } from '../SessionSettingListItem';
import { displayPasswordModal } from '../SessionSettings';

async function toggleLinkPreviews(isToggleOn: boolean, forceUpdate: () => void) {
  if (!isToggleOn) {
    window.inboxStore?.dispatch(
      updateConfirmModal({
        title: window.i18n('linkPreviewsSend'),
        message: window.i18n('linkPreviewsSendModalDescription'),
        okTheme: SessionButtonColor.Danger,
        onClickOk: async () => {
          const newValue = !isToggleOn;
          await window.setSettingValue(SettingsKey.settingsLinkPreview, newValue);
          forceUpdate();
        },
        onClickClose: () => {
          window.inboxStore?.dispatch(updateConfirmModal(null));
        },
      })
    );
  } else {
    await window.setSettingValue(SettingsKey.settingsLinkPreview, false);
    await Storage.put(SettingsKey.hasLinkPreviewPopupBeenDisplayed, false);
    forceUpdate();
  }
}

const TypingBubbleItem = () => {
  return (
    <>
      <SpacerLG />
      <TypingBubble conversationType={ConversationTypeEnum.PRIVATE} isTyping={true} />
    </>
  );
};

export const SettingsCategoryPrivacy = (props: {
  hasPassword: boolean | null;
  onPasswordUpdated: (action: string) => void;
}) => {
  const forceUpdate = useUpdate();
  const isLinkPreviewsOn = useHasLinkPreviewEnabled();
  const areBlindedRequestsEnabled = useHasBlindedMsgRequestsEnabled();

  if (props.hasPassword !== null) {
    return (
      <>
        <SessionToggleWithDescription
          onClickToggle={async () => {
            const old = Boolean(window.getSettingValue(SettingsKey.settingsReadReceipt));
            await window.setSettingValue(SettingsKey.settingsReadReceipt, !old);
            forceUpdate();
          }}
          title={window.i18n('readReceipts')}
          description={window.i18n('readReceiptsDescription')}
          active={window.getSettingValue(SettingsKey.settingsReadReceipt)}
          dataTestId="enable-read-receipts"
        />
        <SessionToggleWithDescription
          onClickToggle={async () => {
            const old = Boolean(window.getSettingValue(SettingsKey.settingsTypingIndicator));
            await window.setSettingValue(SettingsKey.settingsTypingIndicator, !old);
            forceUpdate();
          }}
          title={window.i18n('typingIndicators')}
          description={window.i18n('typingIndicatorsDescription')}
          active={Boolean(window.getSettingValue(SettingsKey.settingsTypingIndicator))}
          childrenDescription={<TypingBubbleItem />}
        />
        <SessionToggleWithDescription
          onClickToggle={() => {
            void toggleLinkPreviews(isLinkPreviewsOn, forceUpdate);
          }}
          title={window.i18n('linkPreviewsSend')}
          description={window.i18n('linkPreviewsDescription')}
          active={isLinkPreviewsOn}
        />
        <SessionToggleWithDescription
          onClickToggle={async () => {
            const toggledValue = !areBlindedRequestsEnabled;
            await window.setSettingValue(SettingsKey.hasBlindedMsgRequestsEnabled, toggledValue);
            await SessionUtilUserProfile.insertUserProfileIntoWrapper(
              UserUtils.getOurPubKeyStrFromCache()
            );
            await ConfigurationSync.queueNewJobIfNeeded();
            forceUpdate();
          }}
          title={window.i18n('blindedMsgReqsSettingTitle')}
          description={window.i18n('messageReqeuestsCommunitiesDescription')}
          active={areBlindedRequestsEnabled}
        />

        {!props.hasPassword && (
          <SessionSettingButtonItem
            title={window.i18n('passwordSet')}
            description={window.i18n('passwordDescription')}
            onClick={() => {
              displayPasswordModal('set', props.onPasswordUpdated);
            }}
            buttonText={window.i18n('passwordSet')}
            dataTestId={'set-password-button'}
          />
        )}
        {props.hasPassword && (
          <SessionSettingButtonItem
            // TODO: String localization - remove
            title={window.i18n('passwordChange')}
            description={window.i18n('passwordChangeDescription')}
            onClick={() => {
              displayPasswordModal('change', props.onPasswordUpdated);
            }}
            buttonText={window.i18n('passwordChange')}
            dataTestId="change-password-settings-button"
          />
        )}
        {props.hasPassword && (
          <SessionSettingButtonItem
            description={window.i18n('passwordRemoveDescription')}
            onClick={() => {
              displayPasswordModal('remove', props.onPasswordUpdated);
            }}
            buttonColor={SessionButtonColor.Danger}
            buttonText={window.i18n('passwordRemove')}
            dataTestId="remove-password-settings-button"
          />
        )}
      </>
    );
  }
  return null;
};
