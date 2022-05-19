import Slider from 'rc-slider';
import React from 'react';
// tslint:disable-next-line: no-submodule-imports
import useUpdate from 'react-use/lib/useUpdate';
import { SessionSettingsItemWrapper } from './SessionSettingListItem';
import { ToastUtils } from '../../session/utils';

export const FetchDaysSessionSlider = (props: { onSliderChange?: (value: number) => void }) => {
  const forceUpdate = useUpdate();
  const handleSlider = (valueToForward: number) => {
    props?.onSliderChange?.(valueToForward);
    window.setSettingValue('fetch-days-setting', valueToForward);
    ToastUtils.pushRestartNeeded();
    forceUpdate();
  };
  const currentValueFromSettings = window.getSettingValue('fetch-days-setting') || 15;

  return (
    <SessionSettingsItemWrapper title={window.i18n('fetchDaysTitle')} description={window.i18n('fetchDaysDescription')} inline={false}>
      <div className="slider-wrapper">
        <Slider
          dots={true}
          step={15}
          min={15}
          max={120}
          defaultValue={currentValueFromSettings}
          onAfterChange={handleSlider}
        />

        <div className="slider-info">
          <p>{currentValueFromSettings} {window.i18n('fetchDaysUnits')}</p>
        </div>
      </div>
    </SessionSettingsItemWrapper>
  );
};
