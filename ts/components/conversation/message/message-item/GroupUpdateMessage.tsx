import { useConversationsUsernameWithQuoteOrFullPubkey } from '../../../../hooks/useParamSelector';
import { arrayContainsUsOnly } from '../../../../models/message';
import {
  PropsForGroupUpdate,
  PropsForGroupUpdateType,
} from '../../../../state/ducks/conversations';
import {
  useSelectedDisplayNameInProfile,
  useSelectedNicknameOrProfileNameOrShortenedPubkey,
} from '../../../../state/selectors/selectedConversation';
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
  const groupName = useSelectedNicknameOrProfileNameOrShortenedPubkey();

  if (arrayContainsUsOnly(kicked)) {
    return window.i18n('groupRemovedYou', { group_name: groupName });
  }

  // TODO - support bold
  return kicked.length === 1
    ? window.i18n('groupRemoved', { name: names[0] })
    : kicked.length === 2
      ? window.i18n('groupRemovedTwo', { name: names[0], other_name: names[1] })
      : window.i18n('groupRemovedMore', { name: names[0], count: names.length });
};

const ChangeItemLeft = (left: Array<string>): string => {
  if (!left.length) {
    throw new Error('Group update remove is missing contacts');
  }

  const names = useConversationsUsernameWithQuoteOrFullPubkey(left);

  if (arrayContainsUsOnly(left)) {
    return window.i18n('groupMemberYouLeft');
  }

  // TODO - support bold
  return left.length === 1
    ? window.i18n('groupMemberLeft', { name: names[0] })
    : left.length === 2
      ? window.i18n('groupMemberLeftTwo', { name: names[0], other_name: names[1] })
      : window.i18n('groupMemberLeftMore', { name: names[0], count: names.length });
};

const ChangeItem = (change: PropsForGroupUpdateType): string => {
  const { type } = change;
  switch (type) {
    case 'name':
      return window.i18n('groupNameNew', { group_name: change.newName });
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
