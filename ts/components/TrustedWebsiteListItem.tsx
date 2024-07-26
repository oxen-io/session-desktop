import React from 'react';
import styled from 'styled-components';

import { SessionRadio } from './basic/SessionRadio';

const StyledTrustedWebsiteItem = styled.button<{
  inMentions?: boolean;
  zombie?: boolean;
  selected?: boolean;
  disableBg?: boolean;
}>`
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  flex-grow: 1;
  font-family: var(--font-default);
  padding: 0px var(--margins-sm);
  height: ${props => (props.inMentions ? '40px' : '50px')};
  width: 100%;
  transition: var(--default-duration);
  opacity: ${props => (props.zombie ? 0.5 : 1)};
  background-color: ${props =>
    !props.disableBg && props.selected
      ? 'var(--conversation-tab-background-selected-color) !important'
      : null};

  :not(:last-child) {
    border-bottom: 1px solid var(--border-color);
  }
`;

const StyledInfo = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
`;

const StyledName = styled.span`
  font-weight: bold;
  margin-inline-start: var(--margins-md);
  margin-inline-end: var(--margins-md);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledCheckContainer = styled.div`
  display: flex;
  align-items: center;
`;

export const TrustedWebsiteListItem = (props: {
  hostname: string;
  isSelected: boolean;
  onSelect?: (pubkey: string) => void;
  onUnselect?: (pubkey: string) => void;
}) => {
  const { hostname, isSelected, onSelect, onUnselect } = props;

  return (
    <StyledTrustedWebsiteItem
      onClick={() => {
        if (isSelected) {
          onUnselect?.(hostname);
        } else {
          onSelect?.(hostname);
        }
      }}
      selected={isSelected}
    >
      <StyledInfo>
        <StyledName>{hostname}</StyledName>
      </StyledInfo>

      <StyledCheckContainer>
        <SessionRadio active={isSelected} value={hostname} inputName={hostname} label="" />
      </StyledCheckContainer>
    </StyledTrustedWebsiteItem>
  );
};
