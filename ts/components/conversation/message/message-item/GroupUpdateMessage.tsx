import React from 'react';

import { useConversationsUsernameWithQuoteOrFullPubkey } from '../../../../hooks/useParamSelector';
import { arrayContainsUsOnly } from '../../../../models/message';
import {
  PropsForGroupUpdate,
  PropsForGroupUpdateType,
} from '../../../../state/ducks/conversations';
import { assertUnreachable } from '../../../../types/sqlSharedTypes';
import { ExpirableReadableMessage } from './ExpirableReadableMessage';
import { NotificationBubble } from './notification-bubble/NotificationBubble';

// This component is used to display group updates in the conversation view.

const ChangeItemJoined = (added: Array<string>): string => {
  if (!added.length) {
    throw new Error('Group update add is missing contacts');
  }
  const names = useConversationsUsernameWithQuoteOrFullPubkey(added);
  return window.i18n('groupMemberNew', {
    name: names.join(', '),
  });
};

const ChangeItemKicked = (kicked: Array<string>): string => {
  if (!kicked.length) {
    throw new Error('Group update kicked is missing contacts');
  }
  const names = useConversationsUsernameWithQuoteOrFullPubkey(kicked);

  if (arrayContainsUsOnly(kicked)) {
    return window.i18n('youGotKickedFromGroup');
  }

  const kickedKey = kicked.length > 1 ? 'multipleKickedFromTheGroup' : 'groupRemoved';
  return window.i18n(kickedKey, { name: names.join(', ') });
};

const ChangeItemLeft = (left: Array<string>): string => {
  if (!left.length) {
    throw new Error('Group update remove is missing contacts');
  }

  const names = useConversationsUsernameWithQuoteOrFullPubkey(left);

  if (arrayContainsUsOnly(left)) {
    return window.i18n('groupMemberYouLeft');
  }

  const leftKey = left.length > 1 ? 'multipleLeftTheGroup' : 'groupMemberLeft';
  return window.i18n(leftKey, { name: names.join(', ') });
};

const ChangeItem = (change: PropsForGroupUpdateType): string => {
  const { type } = change;
  switch (type) {
    case 'name':
      return window.i18n('groupNameNew', { groupname: change.newName });
    case 'add':
      return ChangeItemJoined(change.added);

    case 'left':
      return ChangeItemLeft(change.left);

    case 'kicked':
      return ChangeItemKicked(change.kicked);

    case 'general':
      return window.i18n('groupUpdated');
    default:
      assertUnreachable(type, `ChangeItem: Missing case error "${type}"`);
      return '';
  }
};

export const GroupUpdateMessage = (props: PropsForGroupUpdate) => {
  const { change, messageId } = props;

  return (
    <ExpirableReadableMessage
      messageId={messageId}
      key={`readable-message-${messageId}`}
      dataTestId="group-update-message"
      isControlMessage={true}
    >
      <NotificationBubble notificationText={ChangeItem(change)} iconType="users" />
    </ExpirableReadableMessage>
  );
};
