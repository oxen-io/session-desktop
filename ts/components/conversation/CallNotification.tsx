import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { PubKey } from '../../session/types';

import { PropsForCallNotification } from '../../state/ducks/conversations';
import { getSelectedConversation } from '../../state/selectors/conversations';
import { ReadableMessage } from './ReadableMessage';

export const StyledFakeMessageBubble = styled.div`
  background: var(--color-fake-chat-bubble-background);
  color: var(--color-text);

  width: 90%;
  max-width: 700px;
  margin: 10px auto;
  padding: 5px 0px;
  border-radius: 4px;
  word-break: break-word;
  text-align: center;
`;

export const CallNotification = (props: PropsForCallNotification) => {
  const { messageId, receivedAt, isUnread, notificationType } = props;

  const selectedConvoProps = useSelector(getSelectedConversation);

  const displayName =
    selectedConvoProps?.profileName ||
    selectedConvoProps?.name ||
    (selectedConvoProps?.id && PubKey.shorten(selectedConvoProps?.id));

  let notificationText = '';
  if (notificationType === 'missed-call') {
    notificationText = window.i18n('callMissed', displayName);
  } else if (notificationType === 'started-call') {
    notificationText = window.i18n('startedACall', displayName);
  } else if (notificationType === 'answered-a-call') {
    notificationText = window.i18n('answeredACall', displayName);
  }

  return (
    <ReadableMessage
      messageId={messageId}
      receivedAt={receivedAt}
      isUnread={isUnread}
      key={`readable-message-${messageId}`}
    >
      <StyledFakeMessageBubble>{notificationText}</StyledFakeMessageBubble>
    </ReadableMessage>
  );
};
