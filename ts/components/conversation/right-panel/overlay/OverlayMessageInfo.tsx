import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { getRightOverlayMode } from '../../../../state/selectors/section';
import { Flex } from '../../../basic/Flex';
import { SpacerLG } from '../../../basic/Text';
import { RightOverlayHeader } from './RightOverlayHeader';

const StyledScrollContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden auto;
`;

const StyledContainer = styled(Flex)`
  width: 100%;

  .session-button {
    font-weight: 500;
    min-width: 90px;
    width: fit-content;
    margin: 35px auto 0;
  }
`;

export const OverlayMessageInfo = () => {
  const rightOverlay = useSelector(getRightOverlayMode);
  if (!rightOverlay || rightOverlay.type !== 'message_info' || !rightOverlay.params.messageId) {
    return null;
  }
  const { messageId, defaultAttachment } = rightOverlay.params;
  return (
    <StyledScrollContainer>
      <StyledContainer container={true} flexDirection={'column'} alignItems={'center'}>
        <RightOverlayHeader title={window.i18n('messageInfo')} hideBackButton={true} />
        MAKE ME ${messageId} ME ${defaultAttachment}
        <SpacerLG />
      </StyledContainer>
    </StyledScrollContainer>
  );
};
