import React from 'react';
import styled from 'styled-components';
import { useIsRequest } from '../../hooks/useParamSelector';
import {
  useSelectedConversationKey,
  useSelectedHasIncomingMessages,
} from '../../state/selectors/selectedConversation';

const ConversationRequestTextBottom = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  padding: var(--margins-lg);
  background-color: var(--background-secondary-color);
`;

const ConversationRequestTextInner = styled.div`
  color: var(--text-secondary-color);
  text-align: center;
  max-width: 390px;
`;

export const ConversationRequestinfo = () => {
  const selectedConversationKey = useSelectedConversationKey();
  const isIncomingMessageRequest = useIsRequest(selectedConversationKey);

  const showMsgRequestUI = selectedConversationKey && isIncomingMessageRequest;
  const hasIncomingMessages = useSelectedHasIncomingMessages();

  if (!showMsgRequestUI || !hasIncomingMessages) {
    return null;
  }

  return (
    <ConversationRequestTextBottom>
      <ConversationRequestTextInner>
        {window.i18n('respondingToRequestWarning')}
      </ConversationRequestTextInner>
    </ConversationRequestTextBottom>
  );
};
