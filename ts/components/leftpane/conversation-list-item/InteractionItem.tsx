import { isEmpty } from 'lodash';
import { useEffect, useState } from 'react';

import styled from 'styled-components';
import { useIsPrivate, useIsPublic } from '../../../hooks/useParamSelector';
import { getConversationController } from '../../../session/conversations';
import { assertUnreachable } from '../../../types/sqlSharedTypes';
import { MessageBody } from '../../conversation/message/message-content/MessageBody';
import {
  ConversationInteractionType,
  ConversationInteractionStatus,
} from '../../../interactions/types';
import { LastMessageType } from '../../../state/ducks/types';

const StyledInteractionItemText = styled.div<{ isError: boolean }>`
  ${props => props.isError && 'color: var(--danger-color) !important;'}
`;

type InteractionItemProps = {
  conversationId: string;
  lastMessage: LastMessageType | null;
};

export const InteractionItem = (props: InteractionItemProps) => {
  const { conversationId, lastMessage } = props;
  const isGroup = !useIsPrivate(conversationId);
  const isCommunity = useIsPublic(conversationId);

  const [storedLastMessageText, setStoredLastMessageText] = useState(lastMessage?.text);
  const [storedLastMessageInteractionStatus, setStoredLastMessageInteractionStatus] = useState(
    lastMessage?.interactionStatus
  );

  // NOTE we want to reset the interaction state when the last message changes
  useEffect(() => {
    if (conversationId) {
      const convo = getConversationController().get(conversationId);

      if (
        convo &&
        storedLastMessageInteractionStatus !== convo.get('lastMessageInteractionStatus')
      ) {
        setStoredLastMessageInteractionStatus(convo.get('lastMessageInteractionStatus'));
        setStoredLastMessageText(convo.get('lastMessage'));
      }
    }
  }, [conversationId, storedLastMessageInteractionStatus]);

  if (!lastMessage) {
    return null;
  }

  const { interactionType, interactionStatus } = lastMessage || {};

  if (!interactionType || !interactionStatus) {
    return null;
  }

  let text = storedLastMessageText || '';
  let errorText = '';

  const name =
    getConversationController().get(conversationId)?.getNicknameOrRealUsernameOrPlaceholder() ||
    window.i18n('unknown');

  switch (interactionType) {
    case ConversationInteractionType.Hide:
      // if it's hidden or pending hiding, we don't show any text
      break;
    case ConversationInteractionType.Leave:
      errorText = isCommunity
        ? window.i18n('communityLeaveError', { community_name: name })
        : isGroup
          ? window.i18n('groupLeaveErrorFailed', { group_name: name })
          : ''; // this cannot happen
      text =
        interactionStatus === ConversationInteractionStatus.Error
          ? errorText
          : interactionStatus === ConversationInteractionStatus.Start ||
              interactionStatus === ConversationInteractionStatus.Loading
            ? window.i18n('leaving')
            : text;
      break;
    default:
      assertUnreachable(
        interactionType,
        `InteractionItem: Missing case error "${interactionType}"`
      );
  }

  if (isEmpty(text)) {
    return null;
  }

  return (
    <div className="module-conversation-list-item__message">
      <StyledInteractionItemText
        className="module-conversation-list-item__message__text"
        isError={Boolean(interactionStatus === ConversationInteractionStatus.Error)}
      >
        <MessageBody text={text} disableJumbomoji={true} disableLinks={true} isGroup={isGroup} />
      </StyledInteractionItemText>
    </div>
  );
};
