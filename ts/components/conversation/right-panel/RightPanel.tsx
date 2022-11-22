import React from 'react';

import styled from 'styled-components';
import { useRightOverlayMode } from '../../../state/selectors/section';
import { OverlayAllMedia } from './overlay/OverlayAllMedia';
import { OverlayDisappearingMessages } from './overlay/OverlayDisappearingMessages';
import { OverlayMessageInfo } from './overlay/message-info/OverlayMessageInfo';
import { OverlayNotification } from './overlay/OverlayNotification';
import { OverlayRightPanelSettings } from './overlay/OverlayRightPanelSettings';
import { OverlayEditClosedGroup } from './overlay/OverlayEditClosedGroup';
import { OverlayClosedGroupEditName } from './overlay/OverlayClosedGroupEditName';
import { OverlayClosedGroupInvite } from './overlay/OverlayClosedGroupInvite';

export const StyledScrollContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden auto;
  padding-inline: 5px;
`;

const ClosableOverlay = () => {
  const rightOverlayMode = useRightOverlayMode();
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
    case 'closed_group_edit':
      return <OverlayEditClosedGroup />;
    case 'closed_group_edit_name':
      return <OverlayClosedGroupEditName />;
    case 'closed_group_invite':
      return <OverlayClosedGroupInvite />;
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
