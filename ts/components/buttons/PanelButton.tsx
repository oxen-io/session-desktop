import React, { ReactNode } from 'react';
import styled, { CSSProperties } from 'styled-components';
import { Flex } from '../basic/Flex';

// NOTE Used for descendant components
export const StyledContent = styled.div`
  display: flex;
  align-items: center;
  flex-grow: 1;
  width: 100%;
`;

export const StyledText = styled.span`
  font-size: var(--font-size-md);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  /* TODO needs RTL support */
  text-align: left;
`;

export const PanelLabel = styled.p`
  color: var(--text-secondary-color);
  width: 100%;
  margin: 0;
  padding-left: calc(var(--margins-lg) * 2 + var(--margins-sm));
  padding-bottom: var(--margins-sm);
`;

const StyledRoundedPanelButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: auto;
  background: var(--right-panel-item-background-color);
  border-radius: 16px;
  padding: 4px var(--margins-lg);
  width: -webkit-fill-available;
  flex-shrink: 0;
`;

const PanelButtonContainer = styled.div`
  overflow: auto;
  min-height: 40px;
  max-height: 100%;
`;

type PanelButtonGroupProps = {
  children: ReactNode;
  style?: CSSProperties;
};

export const StyledPanelGroupTitle = styled.div`
  color: var(--text-secondary-color);
  align-self: flex-start;
`;

export const PanelButtonGroup = (props: PanelButtonGroupProps) => {
  const { children, style } = props;
  return (
    <StyledRoundedPanelButtonGroup style={style}>
      <PanelButtonContainer>{children}</PanelButtonContainer>
    </StyledRoundedPanelButtonGroup>
  );
};

const StyledPanelButton = styled.button<{
  disableBg?: boolean;
}>`
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  flex-grow: 1;
  font-family: var(--font-default);
  padding: 10px var(--margins-sm);
  min-height: 30px;
  width: 100%;
  transition: var(--default-duration);
  background-color: ${props =>
    !props.disableBg ? 'var(--right-panel-item-background-hover-color) !important' : null};

  :not(:last-child) {
    border-bottom: 1px solid var(--border-color);
  }
`;

export type PanelButtonProps = {
  // https://styled-components.com/docs/basics#styling-any-component
  className?: string;
  disableBg?: boolean;
  children: ReactNode;
  onClick: (...args: Array<any>) => void;
  dataTestId?: string;
  style?: CSSProperties;
};

export const PanelButton = (props: PanelButtonProps) => {
  const { className, disableBg, children, onClick, dataTestId, style } = props;

  return (
    <StyledPanelButton
      className={className}
      disableBg={disableBg}
      onClick={onClick}
      style={style}
      data-testid={dataTestId}
    >
      {children}
    </StyledPanelButton>
  );
};

const StyledSubtitle = styled.p`
  font-size: var(--font-size-xs);
  margin: 0;
  text-align: initial;
`;

export const PanelButtonText = (props: { text: string; subtitle?: string }) => {
  return (
    <Flex
      container={true}
      width={'100%'}
      flexDirection={'column'}
      alignItems={'flex-start'}
      margin="0 var(--margins-lg) 0 var(--margins-lg)"
      minWidth="0"
    >
      <StyledText>{props.text}</StyledText>
      {!!props.subtitle && <StyledSubtitle>{props.subtitle}</StyledSubtitle>}
    </Flex>
  );
};
