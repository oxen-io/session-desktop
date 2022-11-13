import React from 'react';
import styled from 'styled-components';
import { SessionToggle } from '../basic/SessionToggle';
import { SessionIcon, SessionIconType } from '../icon';
import { PanelButton, PanelButtonProps, PanelButtonText, StyledContent } from './PanelButton';

interface PanelIconButton extends Omit<PanelButtonProps, 'children'> {
  iconType: SessionIconType;
  text: string;
  subtitle?: string;
}

const IconContainer = styled.div`
  flex-shrink: 0;
  width: var(--toggle-width);
`;

export const PanelIconButton = (props: PanelIconButton) => {
  const { iconType, text, disableBg, onClick, dataTestId, subtitle } = props;

  return (
    <PanelButton disableBg={disableBg} onClick={onClick} dataTestId={dataTestId}>
      <StyledContent>
        <IconContainer>
          <SessionIcon iconType={iconType} iconSize="medium" />
        </IconContainer>
        <PanelButtonText text={text} subtitle={subtitle} />
      </StyledContent>
    </PanelButton>
  );
};

interface PanelIconButtonWithToggle extends Omit<PanelButtonProps, 'children'> {
  text: string;
  subtitle?: string;
  isActive: boolean;
}

export const PanelIconButtonWithToggle = (props: PanelIconButtonWithToggle) => {
  const { text, disableBg, onClick, isActive, dataTestId, subtitle } = props;

  return (
    <PanelButton disableBg={disableBg} onClick={onClick} dataTestId={dataTestId}>
      <StyledContent>
        <IconContainer>
          <SessionToggle active={isActive} onClick={onClick} />
        </IconContainer>
        <PanelButtonText text={text} subtitle={subtitle} />
      </StyledContent>
    </PanelButton>
  );
};
