import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { useIsIncomingRequest } from '../../hooks/useParamSelector';
import {
  approveConvoAndSendResponse,
  declineConversationWithConfirm,
} from '../../interactions/conversationInteractions';
import { getConversationController } from '../../session/conversations';
import {
  getSelectedConversation,
  hasSelectedConversationIncomingMessages,
} from '../../state/selectors/conversations';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';

const StyledBlockUserText = styled.span`
  color: var(--color-destructive);
  cursor: pointer;
  font-size: var(--font-size-md);
  align-self: center;
  font-weight: 700;
`;

const ConversationBannerRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: var(--margins-lg);
  justify-content: center;
`;

const ConversationRequestBanner = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--margins-lg);
  gap: var(--margins-sm);
`;

const handleDeclineConversationRequest = (convoId: string) => {
  declineConversationWithConfirm({
    conversationId: convoId,
    syncToDevices: true,
    blockContact: false,
  });
};

const handleDeclineAndBlockConversationRequest = (convoId: string) => {
  declineConversationWithConfirm({
    conversationId: convoId,
    syncToDevices: true,
    blockContact: true,
  });
};

const handleAcceptConversationRequest = async (convoId: string) => {
  const convo = getConversationController().get(convoId);
  await convo.setDidApproveMe(true);
  await convo.addOutgoingApprovalMessage(Date.now());
  await approveConvoAndSendResponse(convoId, true);
};

export const ConversationMessageRequestButtons = () => {
  const selectedConversation = useSelector(getSelectedConversation);

  const hasIncomingMessages = useSelector(hasSelectedConversationIncomingMessages);
  const isIncomingMessageRequest = useIsIncomingRequest(selectedConversation?.id);

  if (!selectedConversation || !hasIncomingMessages) {
    return null;
  }

  if (!isIncomingMessageRequest) {
    return null;
  }

  return (
    <ConversationRequestBanner>
      <ConversationBannerRow>
        <SessionButton
          buttonColor={SessionButtonColor.Green}
          buttonType={SessionButtonType.BrandOutline}
          onClick={async () => {
            await handleAcceptConversationRequest(selectedConversation.id);
          }}
          text={window.i18n('accept')}
          dataTestId="accept-message-request"
        />

        <SessionButton
          buttonColor={SessionButtonColor.Danger}
          buttonType={SessionButtonType.BrandOutline}
          text={window.i18n('decline')}
          onClick={() => {
            handleDeclineConversationRequest(selectedConversation.id);
          }}
          dataTestId="decline-message-request"
        />
      </ConversationBannerRow>
      <ConversationRequestExplanation />

      <StyledBlockUserText
        onClick={() => {
          handleDeclineAndBlockConversationRequest(selectedConversation.id);
        }}
        data-testid="decline-and-block-message-request"
      >
        {window.i18n('blockUser')}
      </StyledBlockUserText>
    </ConversationRequestBanner>
  );
};

const ConversationRequestExplanation = () => {
  return (
    <ConversationRequestTextBottom>
      <ConversationRequestTextInner>
        {window.i18n('respondingToRequestWarning')}
      </ConversationRequestTextInner>
    </ConversationRequestTextBottom>
  );
};

const ConversationRequestTextBottom = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  padding: var(--margins-xs) var(--margins-lg);
`;

const ConversationRequestTextInner = styled.div`
  color: var(--color-text-subtle);
  text-align: center;

  max-width: 450px;
  font-size: var(--font-size-sm);
`;
