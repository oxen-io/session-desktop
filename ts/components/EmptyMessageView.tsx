import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useMount } from 'react-use';
import styled from 'styled-components';
import { getLeftPaneConversationIdsCount } from '../state/selectors/conversations';
import { isSignWithRecoveryPhrase } from '../util/storage';
import { Flex } from './basic/Flex';
import { Spacer2XL, SpacerXS } from './basic/Text';

const StyledPlaceholder = styled(Flex)`
  background-color: var(--background-secondary-color);
  height: 100%;
`;

const StyledSessionFullLogo = styled(Flex)`
  img:first-child {
    height: 180px;
    filter: brightness(0) saturate(100%) invert(75%) sepia(84%) saturate(3272%) hue-rotate(103deg)
      brightness(106%) contrast(103%);
    -webkit-user-drag: none;
  }

  img:nth-child(2) {
    margin-top: 10px;
    width: 250px;
    transition: 0s;
    filter: var(--session-logo-text-current-filter);
    -webkit-user-drag: none;
  }
`;

const StyledPartyPopper = styled.img`
  height: 180px;
  margin: 0 auto;
  -webkit-user-drag: none;
`;

const StyledP = styled.p`
  margin: 0;
  padding: 0;
  text-align: center;
`;

const StyledHeading = styled(StyledP)`
  margin: 0 0 var(--margins-md);
  line-height: 1;
  font-size: 48px;
  font-weight: 700;
`;

const StyledSessionWelcome = styled(StyledP)`
  line-height: 1;
  color: var(--primary-color);
  font-size: 32px;
`;

const StyledHR = styled.hr`
  color: var(--text-secondary-color);
  opacity: 0.5;
  width: 300px;
  border-width: 0.5px;
  margin: 40px 0 var(--margins-lg);
`;

const StyledNoConversations = styled(StyledP)`
  font-size: 24px;
  font-weight: 700;
`;

export const EmptyMessageView = () => {
  const conversationCount = useSelector(getLeftPaneConversationIdsCount);
  const isSignInWithRecoveryPhrase = isSignWithRecoveryPhrase();

  const [newAccountCreated, setNewAccountCreated] = useState(false);

  useMount(() => {
    const launchCount = window.getSettingValue('launch-count');
    if (!isSignInWithRecoveryPhrase && (!launchCount || launchCount < 1)) {
      setNewAccountCreated(true);
    }
  });

  return (
    <StyledPlaceholder
      container={true}
      width={'100%'}
      className="content"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      {newAccountCreated ? (
        <>
          <StyledPartyPopper src="images/party-popper.svg" alt="party popper emoji" />
          <Spacer2XL />
          <StyledHeading>{window.i18n('onboardingAccountCreated')}</StyledHeading>
          <StyledSessionWelcome>
            {window.i18n('onboardingBubbleWelcomeToSession')}
          </StyledSessionWelcome>
        </>
      ) : (
        <StyledSessionFullLogo
          container={true}
          className="content"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          margin="0 auto"
        >
          <img src="images/session/brand.svg" alt="full-brand-logo" />
          <img src="images/session/session-text.svg" alt="full-brand-text" />
        </StyledSessionFullLogo>
      )}
      {!conversationCount ? (
        <>
          <StyledHR />
          <StyledNoConversations>{window.i18n('conversationsNone')}</StyledNoConversations>
          <SpacerXS />
          <StyledP style={{ width: '360px' }}>{window.i18n('onboardingHitThePlusButton')}</StyledP>
        </>
      ) : null}
    </StyledPlaceholder>
  );
};