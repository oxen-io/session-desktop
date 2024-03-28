import React from 'react';

import useUpdate from 'react-use/lib/useUpdate';
import { SettingsKey } from '../../../data/settings-key';
import { isHideMenuBarSupported } from '../../../types/Settings';
import { useHasFollowSystemThemeEnabled } from '../../../state/selectors/settings';
import { ensureThemeConsistency } from '../../../themes/SessionTheme';
import { SessionToggleWithDescription } from '../SessionSettingListItem';
import { SettingsThemeSwitcher } from '../SettingsThemeSwitcher';
import { ZoomingSessionSlider } from '../ZoomingSessionSlider';

export const SettingsCategoryAppearance = (props: { hasPassword: boolean | null }) => {
  const forceUpdate = useUpdate();
  const isFollowSystemThemeEnabled = useHasFollowSystemThemeEnabled();

  if (props.hasPassword !== null) {
    const isHideMenuBarActive =
      window.getSettingValue(SettingsKey.settingsMenuBar) === undefined
        ? true
        : window.getSettingValue(SettingsKey.settingsMenuBar);

    return (
      <>
        <SettingsThemeSwitcher />
        <ZoomingSessionSlider />
        {isHideMenuBarSupported() && (
          <SessionToggleWithDescription
            onClickToggle={() => {
              window.toggleMenuBar();
              forceUpdate();
            }}
            title={window.i18n('appearanceHideMenuBar')}
            description={window.i18n('appearanceHideMenuBar')}
            active={isHideMenuBarActive}
          />
        )}
        <SessionToggleWithDescription
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onClickToggle={async () => {
            const toggledValue = !isFollowSystemThemeEnabled;
            await window.setSettingValue(SettingsKey.hasFollowSystemThemeEnabled, toggledValue);
            if (!isFollowSystemThemeEnabled) {
              await ensureThemeConsistency();
            }
          }}
          title={window.i18n('appearanceAutoDarkMode')}
          description={window.i18n('followSystemSettings')}
          active={isFollowSystemThemeEnabled}
          dataTestId="enable-follow-system-theme"
        />
      </>
    );
  }
  return null;
};
