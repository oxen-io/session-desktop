import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { getShowScrollButton } from '../state/selectors/conversations';
import { useIsRightOverlayShown } from '../state/selectors/section';

import { SessionIconButton } from './icon';

const SessionScrollButtonDiv = styled.div<{ isRightOverlayShown: boolean }>`
  position: fixed;
  z-index: 2;
  right: ${props => (props.isRightOverlayShown ? 'calc(60px + 25vw);' : '60px')};
  animation: fadein var(--default-duration);

  .session-icon-button {
    background-color: var(--message-bubbles-received-background-color);
    box-shadow: var(--scroll-button-shadow);
  }
`;

export const SessionScrollButton = (props: { onClickScrollBottom: () => void }) => {
  const show = useSelector(getShowScrollButton);
  const isRightOverlayShown = useIsRightOverlayShown();

  return (
    <SessionScrollButtonDiv isRightOverlayShown={isRightOverlayShown}>
      <SessionIconButton
        iconType="chevron"
        iconSize={'huge'}
        isHidden={!show}
        onClick={props.onClickScrollBottom}
        dataTestId="scroll-to-bottom-button"
      />
    </SessionScrollButtonDiv>
  );
};
