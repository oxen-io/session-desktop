/* eslint-disable @typescript-eslint/no-misused-promises */

import useUpdate from 'react-use/lib/useUpdate';
import { SettingsKey } from '../../../data/settings-key';
import { CallManager, ToastUtils } from '../../../session/utils';
import { updateConfirmModal } from '../../../state/ducks/modalDialog';
import { SessionButtonColor } from '../../basic/SessionButton';

import { SessionToggleWithDescription } from '../SessionSettingListItem';

const toggleCallMediaPermissions = async (triggerUIUpdate: () => void) => {
  const currentValue = window.getCallMediaPermissions();
  if (!currentValue) {
    window.inboxStore?.dispatch(
      updateConfirmModal({
        title: window.i18n('callsVoiceAndVideoBeta'),
        i18nMessage: { token: 'callsVoiceAndVideoModalDescription' },
        okTheme: SessionButtonColor.Danger,
        okText: window.i18n('theContinue'),
        onClickOk: async () => {
          await window.toggleCallMediaPermissionsTo(true);
          triggerUIUpdate();
          CallManager.onTurnedOnCallMediaPermissions();
        },
        onClickCancel: async () => {
          await window.toggleCallMediaPermissionsTo(false);
          triggerUIUpdate();
        },
        onClickClose: () => {
          window.inboxStore?.dispatch(updateConfirmModal(null));
        },
      })
    );
  } else {
    await window.toggleCallMediaPermissionsTo(false);
    triggerUIUpdate();
  }
};

async function toggleStartInTray() {
  try {
    const newValue = !(await window.getStartInTray());

    // make sure to write it here too, as this is the value used on the UI to mark the toggle as true/false
    await window.setSettingValue(SettingsKey.settingsStartInTray, newValue);
    await window.setStartInTray(newValue);
    if (!newValue) {
      ToastUtils.pushRestartNeeded();
    }
  } catch (e) {
    window.log.warn('start in tray change error:', e);
  }
}

export const SettingsCategoryPermissions = () => {
  const forceUpdate = useUpdate();
  const isStartInTrayActive = Boolean(window.getSettingValue(SettingsKey.settingsStartInTray));

  return (
    <>
      <SessionToggleWithDescription
        onClickToggle={async () => {
          await window.toggleMediaPermissions();
          forceUpdate();
        }}
        title={window.i18n('permissionsMicrophone')}
        description={window.i18n('permissionsMicrophoneDescription')}
        active={Boolean(window.getSettingValue('media-permissions'))}
        dataTestId="enable-microphone"
      />
      <SessionToggleWithDescription
        onClickToggle={async () => {
          await toggleCallMediaPermissions(forceUpdate);
          forceUpdate();
        }}
        title={window.i18n('callsVoiceAndVideoBeta')}
        description={window.i18n('callsVoiceAndVideoToggleDescription')}
        active={Boolean(window.getCallMediaPermissions())}
        dataTestId="enable-calls"
      />
      <SessionToggleWithDescription
        onClickToggle={async () => {
          const old = Boolean(window.getSettingValue(SettingsKey.settingsAutoUpdate));
          await window.setSettingValue(SettingsKey.settingsAutoUpdate, !old);
          forceUpdate();
        }}
        title={window.i18n('permissionsAutoUpdate')}
        description={window.i18n('permissionsAutoUpdateDescription')}
        active={Boolean(window.getSettingValue(SettingsKey.settingsAutoUpdate))}
      />
      <SessionToggleWithDescription
        onClickToggle={async () => {
          await toggleStartInTray();
          forceUpdate();
        }}
        title={window.i18n('permissionsKeepInSystemTray')}
        description={window.i18n('permissionsKeepInSystemTrayDescription')}
        active={isStartInTrayActive}
      />
    </>
  );
};
