import React from 'react';
import styled from 'styled-components';

const StyledKnob = styled.div<{ active: boolean }>`
  position: absolute;
  top: ${props => (props.active ? '1px' : '0.5px')};
  left: ${props => (props.active ? '2px' : '0.5px')};
  height: 21px;
  width: 21px;
  border-radius: 28px;
  background-color: var(--toggle-switch-ball-color);
  box-shadow: ${props =>
    props.active
      ? '-2px 1px 3px var(--toggle-switch-ball-shadow-color);'
      : '2px 1px 3px var(--toggle-switch-ball-shadow-color);'};

  transition: transform var(--default-duration) ease, background-color var(--default-duration) ease;

  transform: ${props => (props.active ? 'translateX(25px)' : '')};
`;

const StyledSessionToggle = styled.div<{ active: boolean }>`
  width: var(--toggle-width);
  height: 25px;
  background-color: (--toggle-switch-off-background-color);
  border: 1px solid var(--toggle-switch-off-border-color);
  border-radius: 16px;
  position: relative;
  cursor: pointer;
  transition: var(--default-duration);
  flex-shrink: 0;

  background-color: ${props =>
    props.active
      ? 'var(--toggle-switch-on-background-color)'
      : 'var(--toggle-switch-off-background-color)'};
  border-color: ${props =>
    props.active
      ? 'var(--toggle-switch-on-border-color)'
      : 'var(--toggle-switch-off-border-color)'};
`;

type Props = {
  active: boolean;
  onClick: () => void;
  confirmationDialogParams?: any | undefined;
};

export const SessionToggle = (props: Props) => {
  const clickHandler = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    props.onClick();
  };

  return (
    <StyledSessionToggle role="button" onClick={clickHandler} active={props.active}>
      <StyledKnob active={props.active} />
    </StyledSessionToggle>
  );
};
