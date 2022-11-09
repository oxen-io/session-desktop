import React from 'react';

import { useSelector } from 'react-redux';
import { getRightOverlayMode } from '../../../state/selectors/section';
import { OverlayDisappearingMessages } from './overlay/OverlayDisappearingMessages';
import { OverlayRightPanelSettings } from './overlay/OverlayRightPanelSettings';

const ClosableOverlay = () => {
  const rightOverlayMode = useSelector(getRightOverlayMode);
  console.warn('rightOverlayMode', rightOverlayMode);
  if (!rightOverlayMode) {
    return null;
  }
  switch (rightOverlayMode.type) {
    case 'disappearing_messages':
      return <OverlayDisappearingMessages />;
    case 'default':
    default:
      return <OverlayRightPanelSettings />;
  }
};

export const RightPanel = () => {
  return (
    <div className="right-panel">
      <ClosableOverlay />
    </div>
  );
};
