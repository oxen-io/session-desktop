import useInterval from 'react-use/lib/useInterval';
import useUpdate from 'react-use/lib/useUpdate';
import styled from 'styled-components';
import { CONVERSATION } from '../../session/constants';
import { formatFullDate, getConversationItemString } from '../../util/i18n';

type Props = {
  timestamp?: number;
  /**
   * We display the timestamp differently (UI) when displaying a search result
   */
  isConversationSearchResult: boolean;
};

const UPDATE_FREQUENCY = 60 * 1000;

const TimestampContainerNotListItem = styled.div`
  color: var(--text-secondary-color);
  font-size: var(--font-size-xs);
  line-height: 16px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  user-select: none;
`;

const TimestampContainerListItem = styled(TimestampContainerNotListItem)`
  flex-shrink: 0;
  margin-inline-start: 6px;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const Timestamp = (props: Props) => {
  const update = useUpdate();
  useInterval(update, UPDATE_FREQUENCY);

  const { timestamp, isConversationSearchResult } = props;

  if (timestamp === null || timestamp === undefined) {
    return null;
  }

  let title = '';
  let dateString = '';

  if (timestamp !== CONVERSATION.LAST_JOINED_FALLBACK_TIMESTAMP) {
    dateString = getConversationItemString(new Date(timestamp));

    title = formatFullDate(new Date(timestamp));
  }

  if (isConversationSearchResult) {
    return <TimestampContainerListItem title={title}>{dateString}</TimestampContainerListItem>;
  }
  return <TimestampContainerNotListItem title={title}>{dateString}</TimestampContainerNotListItem>;
};
