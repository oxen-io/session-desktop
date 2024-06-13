import React, { SessionDataTestId } from 'react';
import styled from 'styled-components';
import { Flex } from './basic/Flex';
import { SessionIconButton, SessionIconType } from './icon';
import { StyledRootDialog } from './dialog/StyledRootDialog';

const StyledNoticeBanner = styled(Flex)`
  position: relative;
  background-color: var(--primary-color);
  color: var(--black-color);
  font-size: var(--font-size-md);
  padding: var(--margins-xs) var(--margins-sm);
  text-align: center;
  flex-shrink: 0;
  .session-icon-button {
    position: absolute;
    right: var(--margins-sm);
  }
`;

const StyledText = styled.span`
  margin-right: var(--margins-lg);
`;

type NoticeBannerProps = {
  text: string;
  icon: SessionIconType;
  onButtonClick: () => void;
  dataTestId: SessionDataTestId;
};

export const NoticeBanner = (props: NoticeBannerProps) => {
  const { text, onButtonClick, icon, dataTestId } = props;

  return (
    <StyledNoticeBanner
      container={true}
      flexDirection={'row'}
      justifyContent={'center'}
      alignItems={'center'}
      data-testid={dataTestId}
    >
      <StyledText>{text}</StyledText>
      <SessionIconButton
        iconType={icon}
        iconColor="inherit"
        iconSize="small"
        onClick={event => {
          event?.preventDefault();
          onButtonClick();
        }}
      />
    </StyledNoticeBanner>
  );
};

const StyledGroupInviteBanner = styled(Flex)`
  position: relative;
  background-color: var(--orange-color);
  color: var(--black-color);
  font-size: var(--font-size-sm);
  padding: var(--margins-xs) var(--margins-lg);
  text-align: center;
  flex-shrink: 0;

  // when part a a dialog, invert it and make it narrower (as the dialog grows to make it fit)
  ${StyledRootDialog} & {
    background-color: unset;
    color: var(--orange-color);
    max-width: 300px;
  }
`;

export const GroupInviteRequiredVersionBanner = () => {
  return (
    <StyledGroupInviteBanner data-testid="invite-warning">
      {window.i18n('versionRequiredForNewGroupDescription')}
    </StyledGroupInviteBanner>
  );
};
