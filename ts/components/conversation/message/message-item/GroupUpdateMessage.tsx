import {
  getJoinedGroupUpdateChangeStr,
  getKickedGroupUpdateStr,
  getLeftGroupUpdateChangeStr,
} from '../../../../models/groupUpdate';
import {
  PropsForGroupUpdate,
  PropsForGroupUpdateType,
} from '../../../../state/ducks/conversations';
import { useSelectedNicknameOrProfileNameOrShortenedPubkey } from '../../../../state/selectors/selectedConversation';
import { assertUnreachable } from '../../../../types/sqlSharedTypes';
import { ExpirableReadableMessage } from './ExpirableReadableMessage';
import { NotificationBubble } from './notification-bubble/NotificationBubble';

// This component is used to display group updates in the conversation view.

const ChangeItemJoined = (added: Array<string>): string => {
  const groupName = useSelectedNicknameOrProfileNameOrShortenedPubkey();

  if (!added.length) {
    throw new Error('Group update added is missing details');
  }
  // this is not ideal, but also might not be changed as part of Strings but,
  // we return a string containing style tags (<b> etc) here, and a SessionHtmlRenderer is going
  // to render them correctly.
  return getJoinedGroupUpdateChangeStr(added, groupName, false);
};

const ChangeItemKicked = (kicked: Array<string>): string => {
  if (!kicked.length) {
    throw new Error('Group update kicked is missing details');
  }
  const groupName = useSelectedNicknameOrProfileNameOrShortenedPubkey();
  // this is not ideal, but also might not be changed as part of Strings but,
  // we return a string containing style tags (<b> etc) here, and a SessionHtmlRenderer is going
  // to render them correctly.
  return getKickedGroupUpdateStr(kicked, groupName, false);
};

const ChangeItemLeft = (left: Array<string>): string => {
  const groupName = useSelectedNicknameOrProfileNameOrShortenedPubkey();

  if (!left.length) {
    throw new Error('Group update left is missing details');
  }
  // this is not ideal, but also might not be changed as part of Strings but,
  // we return a string containing style tags (<b> etc) here, and a SessionHtmlRenderer is going
  // to render them correctly.
  return getLeftGroupUpdateChangeStr(left, groupName, false);
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
