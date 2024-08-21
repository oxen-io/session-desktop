import { isNull } from 'lodash';
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
import { I18n } from '../../../basic/I18n';
import { I18nProps, LocalizerToken } from '../../../../types/Localizer';

// This component is used to display group updates in the conversation view.

const ChangeItemJoined = (added: Array<string>) => {
  const groupName = useSelectedNicknameOrProfileNameOrShortenedPubkey();

  if (!added.length) {
    throw new Error('Group update added is missing details');
  }

  return getJoinedGroupUpdateChangeStr(added, groupName);
};

const ChangeItemKicked = (kicked: Array<string>) => {
  if (!kicked.length) {
    throw new Error('Group update kicked is missing details');
  }
  const groupName = useSelectedNicknameOrProfileNameOrShortenedPubkey();

  return getKickedGroupUpdateStr(kicked, groupName);
};

const ChangeItemLeft = (left: Array<string>) => {
  const groupName = useSelectedNicknameOrProfileNameOrShortenedPubkey();

  if (!left.length) {
    throw new Error('Group update left is missing details');
  }

  return getLeftGroupUpdateChangeStr(left, groupName);
};

const ChangeItem = (change: PropsForGroupUpdateType) => {
  const { type } = change;
  switch (type) {
    case 'name':
      return { token: 'groupNameNew', args: { group_name: change.newName } };

    case 'add':
      return ChangeItemJoined(change.added);

    case 'left':
      return ChangeItemLeft(change.left);

    case 'kicked':
      return ChangeItemKicked(change.kicked);

    case 'general':
      return { token: 'groupUpdated' };
    default:
      assertUnreachable(type, `ChangeItem: Missing case error "${type}"`);
      return null;
  }
};

export const GroupUpdateMessage = (props: PropsForGroupUpdate) => {
  const { change, messageId } = props;

  // TODO: clean up this typing
  const changeItem = ChangeItem(change) as I18nProps<LocalizerToken> | null;

  return (
    <ExpirableReadableMessage
      messageId={messageId}
      key={`readable-message-${messageId}`}
      dataTestId="group-update-message"
      isControlMessage={true}
    >
      <NotificationBubble iconType="users">
        {!isNull(changeItem) ? <I18n {...changeItem} /> : null}
      </NotificationBubble>
    </ExpirableReadableMessage>
  );
};
