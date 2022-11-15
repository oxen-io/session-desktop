import React from 'react';
import styled from 'styled-components';
import { useConversationUsername } from '../../../../../hooks/useParamSelector';
import { Avatar, AvatarSize } from '../../../../avatar/Avatar';
import { MessageInfoLabel } from './OverlayMessageInfo';

const StyledAuthorContainer = styled.div`
  display: flex;
  gap: var(--margins-lg);
  align-items: center;
  padding: var(--margins-xs);
`;
const StyledAuthorNamesContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const Name = styled.span`
  font-size: 20px;
  font-weight: 600;
`;
const Pubkey = styled.span`
  font-size: 18px;
  user-select: text;
`;

const FromContainer = styled.div``;

export const MessageInfoAuthor = (props: { sender: string }) => {
  const { sender } = props;
  const profileName = useConversationUsername(sender);
  const from = window.i18n('from');

  return (
    <FromContainer>
      <MessageInfoLabel>{from}</MessageInfoLabel>
      <StyledAuthorContainer>
        <Avatar size={AvatarSize.M} pubkey={sender} onAvatarClick={undefined} />
        <StyledAuthorNamesContainer>
          {!!profileName && <Name>{profileName}</Name>}
          <Pubkey>{sender}</Pubkey>
        </StyledAuthorNamesContainer>
      </StyledAuthorContainer>{' '}
    </FromContainer>
  );
};
