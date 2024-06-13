import React from 'react';
import styled from 'styled-components';
import { useIsIncomingRequest } from '../../hooks/useParamSelector';
import {
  declineConversationWithConfirm,
  handleAcceptConversationRequest,
} from '../../interactions/conversationInteractions';
import {
  useSelectedConversationIdOrigin,
  useSelectedConversationKey,
  useSelectedIsGroupV2,
  useSelectedIsPrivateFriend,
} from '../../state/selectors/selectedConversation';
import { useLibGroupInvitePending } from '../../state/selectors/userGroups';
import { SessionButton, SessionButtonColor } from '../basic/SessionButton';
import { InvitedToGroupControlMessage, MessageRequestExplanation } from './SubtleNotification';

const MessageRequestContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--margins-lg);
  gap: var(--margins-lg);
  background-color: var(--background-secondary-color);
`;

const ConversationBannerRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: var(--margins-lg);
  justify-content: center;

  .session-button {
    padding: 0 36px;
  }
`;

const StyledBlockUserText = styled.span`
  color: var(--danger-color);
  cursor: pointer;
  font-size: var(--font-size-md);
  align-self: center;
  font-weight: 700;
`;

const handleDeclineConversationRequest = (
  convoId: string,
  currentSelected: string | undefined,
  conversationIdOrigin: string | null
) => {
  declineConversationWithConfirm({
    conversationId: convoId,
    syncToDevices: true,
    alsoBlock: false,
    currentlySelectedConvo: currentSelected,
    conversationIdOrigin,
  });
};

const handleDeclineAndBlockConversationRequest = (
  convoId: string,
  currentSelected: string | undefined,
  conversationIdOrigin: string | null
) => {
  declineConversationWithConfirm({
    conversationId: convoId,
    syncToDevices: true,
    alsoBlock: true,
    currentlySelectedConvo: currentSelected,
    conversationIdOrigin,
  });
};

export const ConversationMessageRequestButtons = () => {
  const selectedConvoId = useSelectedConversationKey();
  const isIncomingRequest = useIsIncomingRequest(selectedConvoId);
  const isGroupV2 = useSelectedIsGroupV2();
  const isPrivateAndFriend = useSelectedIsPrivateFriend();
  const isGroupPendingInvite = useLibGroupInvitePending(selectedConvoId);
  const convoOrigin = useSelectedConversationIdOrigin() ?? null;

  if (
    !selectedConvoId ||
    isPrivateAndFriend || // if we are already friends, there is no need for the msg request buttons
    (isGroupV2 && !isGroupPendingInvite)
  ) {
    return null;
  }

  if (!isIncomingRequest) {
    return null;
  }

  return (
    <MessageRequestContainer>
      <InvitedToGroupControlMessage />
      <ConversationBannerRow>
        <SessionButton
          onClick={() => {
            void handleAcceptConversationRequest({ convoId: selectedConvoId });
          }}
          text={window.i18n('accept')}
          dataTestId="accept-message-request"
        />
        <SessionButton
          buttonColor={SessionButtonColor.Danger}
          text={window.i18n('delete')}
          onClick={() => {
            handleDeclineConversationRequest(selectedConvoId, selectedConvoId, convoOrigin);
          }}
          dataTestId="decline-message-request"
        />
      </ConversationBannerRow>
      <MessageRequestExplanation />

      {(isGroupV2 && !!convoOrigin) || !isGroupV2 ? (
        <StyledBlockUserText
          onClick={() => {
            handleDeclineAndBlockConversationRequest(selectedConvoId, selectedConvoId, convoOrigin);
          }}
          data-testid="decline-and-block-message-request"
        >
          {window.i18n('block')}
        </StyledBlockUserText>
      ) : null}
    </MessageRequestContainer>
  );
};
