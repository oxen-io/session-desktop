import React from 'react';

import { PubkeyType } from 'libsession_util_nodejs';
import { useConversationsUsernameWithQuoteOrShortPk } from '../../../../hooks/useParamSelector';
import { FormatNotifications } from '../../../../notifications/formatNotifications';
import { PreConditionFailed } from '../../../../session/utils/errors';
import {
  PropsForGroupUpdate,
  PropsForGroupUpdateType,
} from '../../../../state/ducks/conversations';
import { useSelectedIsGroupV2 } from '../../../../state/selectors/selectedConversation';
import { useOurPkStr } from '../../../../state/selectors/user';
import { assertUnreachable } from '../../../../types/sqlSharedTypes';
import { ExpirableReadableMessage } from './ExpirableReadableMessage';
import { NotificationBubble } from './notification-bubble/NotificationBubble';

// TODO those lookups might need to be memoized
const ChangeItemJoined = (added: Array<PubkeyType>, withHistory: boolean): string => {
  if (!added.length) {
    throw new Error('Group update add is missing contacts');
  }
  const names = useConversationsUsernameWithQuoteOrShortPk(added);
  const isGroupV2 = useSelectedIsGroupV2();
  const us = useOurPkStr();
  if (isGroupV2) {
    return FormatNotifications.changeOfMembersV2({
      changedWithNames: FormatNotifications.mapIdsWithNames(added, names),
      type: withHistory ? 'addedWithHistory' : 'added',
      us,
    });
  }
  const joinKey = added.length > 1 ? 'multipleJoinedTheGroup' : 'joinedTheGroup';
  return window.i18n(joinKey, [names.join(', ')]);
};

const ChangeItemKicked = (removed: Array<PubkeyType>): string => {
  if (!removed.length) {
    throw new Error('Group update removed is missing contacts');
  }
  const names = useConversationsUsernameWithQuoteOrShortPk(removed);
  const isGroupV2 = useSelectedIsGroupV2();
  const us = useOurPkStr();
  if (isGroupV2) {
    return FormatNotifications.changeOfMembersV2({
      changedWithNames: FormatNotifications.mapIdsWithNames(removed, names),
      type: 'removed',
      us,
    });
  }

  // legacy groups
  if (FormatNotifications.arrayContainsUsOnly(removed)) {
    return window.i18n('youGotKickedFromGroup');
  }

  const kickedKey = removed.length > 1 ? 'multipleKickedFromTheGroup' : 'kickedFromTheGroup';
  return window.i18n(kickedKey, [names.join(', ')]);
};

const ChangeItemPromoted = (promoted: Array<PubkeyType>): string => {
  if (!promoted.length) {
    throw new Error('Group update promoted is missing contacts');
  }
  const names = useConversationsUsernameWithQuoteOrShortPk(promoted);
  const isGroupV2 = useSelectedIsGroupV2();
  const us = useOurPkStr();
  if (isGroupV2) {
    return FormatNotifications.changeOfMembersV2({
      changedWithNames: FormatNotifications.mapIdsWithNames(promoted, names),
      type: 'promoted',
      us,
    });
  }
  throw new PreConditionFailed('ChangeItemPromoted only applies to groupv2');
};

const ChangeItemAvatar = (): string => {
  const isGroupV2 = useSelectedIsGroupV2();
  if (isGroupV2) {
    return window.i18n('groupAvatarChange');
  }
  throw new PreConditionFailed('ChangeItemAvatar only applies to groupv2');
};

const ChangeItemLeft = (left: Array<PubkeyType>): string => {
  if (!left.length) {
    throw new Error('Group update remove is missing contacts');
  }

  const names = useConversationsUsernameWithQuoteOrShortPk(left);

  if (FormatNotifications.arrayContainsUsOnly(left)) {
    return window.i18n('youLeftTheGroup');
  }

  const leftKey = left.length > 1 ? 'multipleLeftTheGroup' : 'leftTheGroup';
  return window.i18n(leftKey, [names.join(', ')]);
};

const ChangeItemName = (newName: string) => {
  const isGroupV2 = useSelectedIsGroupV2();
  if (isGroupV2) {
    return newName
      ? window.i18n('groupNameChange', [newName])
      : window.i18n('groupNameChangeFallback');
  }
  return window.i18n('titleIsNow', [newName || '']);
};

const ChangeItem = (change: PropsForGroupUpdateType): string => {
  const { type } = change;
  switch (type) {
    case 'name':
      return ChangeItemName(change.newName);
    case 'add':
      return ChangeItemJoined(change.added, change.withHistory);
    case 'left':
      return ChangeItemLeft(change.left);
    case 'kicked':
      return ChangeItemKicked(change.kicked);
    case 'promoted':
      return ChangeItemPromoted(change.promoted);
    case 'avatarChange':
      return ChangeItemAvatar();
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
