import { ipcRenderer } from 'electron';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import {
  useMessageDirection,
  useMessageExpirationDurationMs,
  useMessageExpirationTimestamp,
  useMessageIsExpired,
  useMessageIsUnread,
  useMessageStatus,
} from '../../../../state/selectors';

import { useIsDetailMessageView } from '../../../../contexts/isDetailViewContext';
import { getMostRecentOutgoingMessageId } from '../../../../state/selectors/conversations';
import { useSelectedIsGroupOrCommunity } from '../../../../state/selectors/selectedConversation';
import { SpacerXS } from '../../../basic/Text';
import { SessionIcon, SessionIconType } from '../../../icon';
import { ExpireTimer } from '../../ExpireTimer';

type Props = {
  messageId: string;
  dataTestId?: string | undefined;
};

/**
 * MessageStatus is used to display the status of an outgoing OR incoming message.
 * There are 3 parts to this status: a status text, a status icon and a expiring stopwatch.
 * At all times, we either display `text + icon` OR `text + stopwatch`.
 *
 * The logic to display the text is :
 *   - if the message is expiring:
 *        - if the message is incoming: display its 'read' state and the stopwatch icon (1)
 *        - if the message is outgoing: display its status and the stopwatch, unless when the status is error or sending (just display icon and text in this case, no stopwatch) (2)
 *   - if the message is not expiring:
 *        - if the message is incoming: do not show anything (3)
 *        - if the message is outgoing: show the text for the last message, or a message sending, or in the error state. (4)
 */
export const MessageStatus = ({ messageId, dataTestId }: Props) => {
  const isDetailView = useIsDetailMessageView();

  const status = useMessageStatus(messageId);

  const direction = useMessageDirection(messageId);
  const expirationDurationMs = useMessageExpirationDurationMs(messageId);
  const expirationTimestamp = useMessageExpirationTimestamp(messageId);
  const isUnread = useMessageIsUnread(messageId);

  if (!messageId || !messageId || isDetailView) {
    return null;
  }
  const isIncoming = direction === 'incoming';

  if (isIncoming) {
    if (isUnread || !expirationDurationMs || !expirationTimestamp) {
      return null; // incoming and not expiring, this is case (3) above
    }
    // incoming and  expiring, this is case (1) above
    return <MessageStatusRead dataTestId={dataTestId} messageId={messageId} isIncoming={true} />;
  }

  switch (status) {
    case 'sending':
      return <MessageStatusSending dataTestId={dataTestId} messageId={messageId} />; // we always show sending state
    case 'sent':
      return <MessageStatusSent dataTestId={dataTestId} messageId={messageId} />;
    case 'read':
      return <MessageStatusRead dataTestId={dataTestId} messageId={messageId} isIncoming={false} />; // read is used for both incoming and outgoing messages, but not with the same UI
    case 'error':
      return <MessageStatusError dataTestId={dataTestId} messageId={messageId} />; // we always show error state
    default:
      return null;
  }
};

const MessageStatusContainer = styled.div<{ isIncoming: boolean; isGroup: boolean }>`
  display: inline-block;
  align-self: ${props => (props.isIncoming ? 'flex-start' : 'flex-end')};
  flex-direction: ${props =>
    props.isIncoming
      ? 'row-reverse'
      : 'row'}; // we want {icon}{text} for incoming read messages, but {text}{icon} for outgoing messages

  margin-bottom: 2px;
  margin-inline-start: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-inline-start: ${props =>
    props.isGroup || !props.isIncoming ? 'var(--width-avatar-group-msg-list)' : 0};
`;

const StyledStatusText = styled.div<{ textColor: string }>`
  font-size: small;
  color: ${props => props.textColor};
`;

const TextDetails = ({ text, textColor }: { text: string; textColor: string }) => {
  return (
    <>
      <StyledStatusText textColor={textColor}>{text}</StyledStatusText>
      <SpacerXS />
    </>
  );
};

function IconDanger({ iconType }: { iconType: SessionIconType }) {
  return <SessionIcon iconColor={'var(--danger-color'} iconType={iconType} iconSize="tiny" />;
}

function IconNormal({
  iconType,
  rotateDuration,
}: {
  iconType: SessionIconType;
  rotateDuration?: number | undefined;
}) {
  return (
    <SessionIcon
      rotateDuration={rotateDuration}
      iconColor={'var(--text-secondary-color)'}
      iconType={iconType}
      iconSize="tiny"
    />
  );
}

function useIsExpiring(messageId: string) {
  const expirationDurationMs = useMessageExpirationDurationMs(messageId);
  const expirationTimestamp = useMessageExpirationTimestamp(messageId);
  const messageIsExpired = useMessageIsExpired(messageId);

  return messageId && expirationDurationMs && expirationTimestamp && !messageIsExpired;
}

function useIsMostRecentOutgoingMessage(messageId: string) {
  const mostRecentOutgoingMessageId = useSelector(getMostRecentOutgoingMessageId);
  return mostRecentOutgoingMessageId === messageId;
}

function MessageStatusExpireTimer({ messageId }: Pick<Props, 'messageId'>) {
  const expirationDurationMs = useMessageExpirationDurationMs(messageId);
  const expirationTimestamp = useMessageExpirationTimestamp(messageId);
  const messageIsExpired = useMessageIsExpired(messageId);

  if (!messageId || !expirationDurationMs || !expirationTimestamp || messageIsExpired) {
    return null;
  }
  return (
    <ExpireTimer
      expirationDurationMs={expirationDurationMs}
      expirationTimestamp={expirationTimestamp}
    />
  );
}

const MessageStatusSending = ({ dataTestId }: Omit<Props, 'isDetailView'>) => {
  // while sending, we do not display the expire timer at all.
  return (
    <MessageStatusContainer
      data-testid={dataTestId}
      data-testtype="sending"
      isIncoming={false}
      isGroup={false}
    >
      <TextDetails text={window.i18n('sending')} textColor="var(--text-secondary-color)" />
      <IconNormal rotateDuration={2} iconType="sending" />
    </MessageStatusContainer>
  );
};

/**
 * Returns the correct expiring stopwatch icon if this message is expiring, or a normal status icon otherwise.
 * Only to be used with the status "read" and "sent"
 */
function IconForExpiringMessageId({
  messageId,
  iconType,
}: Pick<Props, 'messageId'> & { iconType: SessionIconType }) {
  const isExpiring = useIsExpiring(messageId);

  return isExpiring ? (
    <MessageStatusExpireTimer messageId={messageId} />
  ) : (
    <IconNormal iconType={iconType} />
  );
}

const MessageStatusSent = ({ dataTestId, messageId }: Omit<Props, 'isDetailView'>) => {
  const isExpiring = useIsExpiring(messageId);
  const isMostRecentOutgoingMessage = useIsMostRecentOutgoingMessage(messageId);
  const isGroup = useSelectedIsGroupOrCommunity();

  // we hide the "sent" message status for a non-expiring messages unless it's the most recent outgoing message
  if (!isExpiring && !isMostRecentOutgoingMessage) {
    return null;
  }
  return (
    <MessageStatusContainer
      data-testid={dataTestId}
      data-testtype="sent"
      isIncoming={false}
      isGroup={isGroup}
    >
      <TextDetails text={window.i18n('sent')} textColor="var(--text-secondary-color)" />
      <IconForExpiringMessageId messageId={messageId} iconType="circleCheck" />
    </MessageStatusContainer>
  );
};

const MessageStatusRead = ({
  dataTestId,
  messageId,
  isIncoming,
}: Omit<Props, 'isDetailView'> & { isIncoming: boolean }) => {
  const isExpiring = useIsExpiring(messageId);
  const isGroup = useSelectedIsGroupOrCommunity();

  const isMostRecentOutgoingMessage = useIsMostRecentOutgoingMessage(messageId);

  // we hide an outgoing "read" message status which is not expiring except for the most recent message
  if (!isIncoming && !isExpiring && !isMostRecentOutgoingMessage) {
    return null;
  }

  return (
    <MessageStatusContainer
      data-testid={dataTestId}
      data-testtype="read"
      isIncoming={isIncoming}
      isGroup={isGroup}
    >
      <TextDetails text={window.i18n('read')} textColor="var(--text-secondary-color)" />
      <IconForExpiringMessageId messageId={messageId} iconType="doubleCheckCircleFilled" />
    </MessageStatusContainer>
  );
};

const MessageStatusError = ({ dataTestId }: Omit<Props, 'isDetailView'>) => {
  const showDebugLog = useCallback(() => {
    ipcRenderer.send('show-debug-log');
  }, []);
  // when on error, we do not display the expire timer at all.
  const isGroup = useSelectedIsGroupOrCommunity();

  return (
    <MessageStatusContainer
      data-testid={dataTestId}
      data-testtype="failed"
      onClick={showDebugLog}
      title={window.i18n('sendFailed')}
      isIncoming={false}
      isGroup={isGroup}
    >
      <TextDetails text={window.i18n('failedToSendMessage')} textColor="var(--danger-color)" />
      <IconDanger iconType="error" />
    </MessageStatusContainer>
  );
};
