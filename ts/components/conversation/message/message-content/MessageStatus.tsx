import React from 'react';
import { MessageRenderingProps } from '../../../../models/messageType';
import { useMessageStatusProps } from '../../../../state/selectors/messages';
import { OutgoingMessageStatus } from './OutgoingMessageStatus';

type Props = {
  isCorrectSide: boolean;
  messageId: string;
  dataTestId?: string;
};

export type MessageStatusSelectorProps = Pick<MessageRenderingProps, 'direction' | 'status'>;

export const MessageStatus = (props: Props) => {
  const { isCorrectSide, dataTestId } = props;

  const selected = useMessageStatusProps(props.messageId);
  if (!selected) {
    return null;
  }
  const { status, direction } = selected;

  if (!isCorrectSide) {
    return null;
  }
  const isIncoming = direction === 'incoming';

  const showStatus = !isIncoming && Boolean(status);
  if (!showStatus) {
    return null;
  }

  return <OutgoingMessageStatus dataTestId={dataTestId} status={status} />;
};
