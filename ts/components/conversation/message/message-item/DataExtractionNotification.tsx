import { PropsForDataExtractionNotification } from '../../../../models/messageType';
import { SignalService } from '../../../../protobuf';
import { ExpirableReadableMessage } from './ExpirableReadableMessage';
import { NotificationBubble } from './notification-bubble/NotificationBubble';
import { I18n } from '../../../basic/I18n';

export const DataExtractionNotification = (props: PropsForDataExtractionNotification) => {
  const { name, type, source, messageId } = props;

  return (
    <ExpirableReadableMessage
      messageId={messageId}
      dataTestId="data-extraction-notification"
      key={`readable-message-${messageId}`}
      isControlMessage={true}
    >
      <NotificationBubble iconType="save">
        <I18n
          token={
            type === SignalService.DataExtractionNotification.Type.MEDIA_SAVED
              ? 'attachmentsMediaSaved'
              : 'screenshotTaken'
          }
          args={{ name: name ?? source }}
        />
      </NotificationBubble>
    </ExpirableReadableMessage>
  );
};
