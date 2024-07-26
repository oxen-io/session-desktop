import React from 'react';
import { PubKey } from '../../../../../session/types';

import {
  CallNotificationType,
  PropsForCallNotification,
} from '../../../../../state/ducks/conversations';
import {
  useSelectedConversationKey,
  useSelectedDisplayNameInProfile,
  useSelectedNickname,
} from '../../../../../state/selectors/selectedConversation';
import { LocalizerToken } from '../../../../../types/Localizer';
import { SessionIconType } from '../../../../icon';
import { ExpirableReadableMessage } from '../ExpirableReadableMessage';
import { NotificationBubble } from './NotificationBubble';

type StyleType = Record<
  CallNotificationType,
  { notificationTextKey: LocalizerToken; iconType: SessionIconType; iconColor: string }
>;

const style = {
  'missed-call': {
    notificationTextKey: 'callsMissedCallFrom',
    iconType: 'callMissed',
    iconColor: 'var(--danger-color)',
  },
  'started-call': {
    notificationTextKey: 'callsYouCalled',
    iconType: 'callOutgoing',
    iconColor: 'inherit',
  },
  'answered-a-call': {
    notificationTextKey: 'callsInProgress',
    iconType: 'callIncoming',
    iconColor: 'inherit',
  },
} satisfies StyleType;

export const CallNotification = (props: PropsForCallNotification) => {
  const { messageId, notificationType } = props;
  const selectedConvoId = useSelectedConversationKey();

  const displayNameInProfile = useSelectedDisplayNameInProfile();
  const nickname = useSelectedNickname();

  const displayName =
    nickname || displayNameInProfile || (selectedConvoId && PubKey.shorten(selectedConvoId));

  const styleItem = style[notificationType];

  const notificationText = window.i18n(styleItem.notificationTextKey, {
    name: displayName ?? window.i18n('unknown'),
  });

  const iconType = styleItem.iconType;
  const iconColor = styleItem.iconColor;

  return (
    <ExpirableReadableMessage
      messageId={messageId}
      key={`readable-message-${messageId}`}
      dataTestId={`call-notification-${notificationType}`}
      isControlMessage={true}
    >
      <NotificationBubble
        notificationText={notificationText}
        iconType={iconType}
        iconColor={iconColor}
      />
    </ExpirableReadableMessage>
  );
};
