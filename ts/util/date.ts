import { formatDistanceToNow, subMilliseconds } from 'date-fns';
import { GetNetworkTime } from '../session/apis/snode_api/getNetworkTime';

export const formatDateDistanceWithOffset = (date: Date): string => {
  const locale = (window.i18n as any).getLocale();
  const adjustedDate = subMilliseconds(date, GetNetworkTime.getLatestTimestampOffset());
  return formatDistanceToNow(adjustedDate, { addSuffix: true, locale });
};
