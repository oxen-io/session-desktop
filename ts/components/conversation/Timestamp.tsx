import React, { useCallback, useState } from 'react';
import moment from 'moment';

// tslint:disable-next-line: no-submodule-imports
import useInterval from 'react-use/lib/useInterval';
import styled from 'styled-components';
import { sync as osLocaleSync } from 'os-locale';

type Props = {
  timestamp?: number;
  isConversationListItem?: boolean;
  momentFromNow: boolean;
};

const UPDATE_FREQUENCY = 60 * 1000;

const TimestampContainerNotListItem = styled.div`
  color: var(--text-secondary-color);
  font-size: var(--font-size-xs);
  line-height: 16px;
  letter-spacing: 0.3px;
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
  const [_lastUpdated, setLastUpdated] = useState(Date.now());
  // this is kind of a hack, but we use lastUpdated just to trigger a refresh.
  // formatRelativeTime() will print the correct moment.
  const update = useCallback(() => {
    setLastUpdated(Date.now());
  }, [setLastUpdated]);

  useInterval(update, UPDATE_FREQUENCY);

  const { timestamp, momentFromNow } = props;

  if (timestamp === null || timestamp === undefined) {
    return null;
  }

  const momentValue = moment(timestamp);
  let dateString: string = '';
  // Set the locale for the timestamps.
  moment.locale(osLocaleSync().replace(/_/g, '-'));

  if (momentFromNow) {
    const now = moment();

    if (momentValue.isSame(now, 'day')) {
      // Today: Use the time only.
      dateString = momentValue.format('LT');
    } else if (now.diff(momentValue, 'days') < 6) {
      // Less than a week old: Use the day and time.
      dateString = momentValue.format('ddd LT');
    } else if (momentValue.isSame(now, 'year')) {
      // This year: Use the month, day of month and time.
      dateString = momentValue.format('MMM D LT');
    } else {
      // Last year or older: Use the full date.
      dateString = momentValue.format('L');
    }
  } else {
    dateString = momentValue.format('lll');
  }

  const title = moment(timestamp).format('llll');
  if (props.isConversationListItem) {
    return <TimestampContainerListItem title={title}>{dateString}</TimestampContainerListItem>;
  }
  return <TimestampContainerNotListItem title={title}>{dateString}</TimestampContainerNotListItem>;
};
