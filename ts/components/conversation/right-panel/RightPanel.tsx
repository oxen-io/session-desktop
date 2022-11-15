import React from 'react';

import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { getRightOverlayMode } from '../../../state/selectors/section';
import { OverlayAllMedia } from './overlay/OverlayAllMedia';
import { OverlayDisappearingMessages } from './overlay/OverlayDisappearingMessages';
import { OverlayMessageInfo } from './overlay/message-info/OverlayMessageInfo';
import { OverlayNotification } from './overlay/OverlayNotification';
import { OverlayRightPanelSettings } from './overlay/OverlayRightPanelSettings';

export const StyledScrollContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden auto;
`;

const ClosableOverlay = () => {
  const rightOverlayMode = useSelector(getRightOverlayMode);
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
    case 'notifications':
      return <OverlayNotification />;
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
