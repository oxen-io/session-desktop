import React from 'react';

import { useSelector } from 'react-redux';
import { getRightOverlayMode } from '../../../state/selectors/section';
import { OverlayAllMedia } from './overlay/OverlayAllMedia';
import { OverlayDisappearingMessages } from './overlay/OverlayDisappearingMessages';
import { OverlayMessageInfo } from './overlay/OverlayMessageInfo';
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
    case 'message_info':
      return <OverlayMessageInfo />;
    case 'show_media':
      return <OverlayAllMedia />;
    case 'default':
      return <OverlayRightPanelSettings />;

    default:
      throw new Error(`ClosableOverlay does not handle type ${(rightOverlayMode as any)?.type}`);
  }
};

export const RightPanel = () => {
  return (
    <div className="right-panel">
      <ClosableOverlay />
    </div>
  );
};
