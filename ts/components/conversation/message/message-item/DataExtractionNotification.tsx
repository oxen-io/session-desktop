import { PropsForDataExtractionNotification } from '../../../../models/messageType';
import { SignalService } from '../../../../protobuf';
import { ExpirableReadableMessage } from './ExpirableReadableMessage';
import { NotificationBubble } from './notification-bubble/NotificationBubble';

export const DataExtractionNotification = (props: PropsForDataExtractionNotification) => {
  const { name, type, source, messageId } = props;

  const contentText =
    type === SignalService.DataExtractionNotification.Type.MEDIA_SAVED
      ? window.i18n('attachmentsMediaSaved', { name: name ?? source })
      : window.i18n('screenshotTaken', { name: name ?? source });

  return (
    <ExpirableReadableMessage
      messageId={messageId}
      dataTestId="data-extraction-notification"
      key={`readable-message-${messageId}`}
      isControlMessage={true}
    >
      <NotificationBubble notificationText={contentText} iconType="save" />
    </ExpirableReadableMessage>
  );
};
