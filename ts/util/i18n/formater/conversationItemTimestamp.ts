import { isAfter, isBefore, subDays } from 'date-fns';
import { getLocale } from '../shared';

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Returns
 * - hh:mm when less than 24h ago
 * - Tue hh:mm when less than 7d ago
 * - dd/mm/yy otherwise
 *
 */
export const getConversationItemString = (date: Date) => {
  const now = new Date();

  // if this is in the future, or older than 7 days ago we display date+time
  if (isAfter(date, now) || isBefore(date, subDays(now, 7))) {
    const formatter = new Intl.DateTimeFormat(getLocale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true, // This will switch between 12-hour and 24-hour format depending on the locale
    });
    return formatter.format(date);
  }

  // if since our start of the day, display the hour and minute only, am/pm locale dependent
  if (isAfter(date, getStartOfToday())) {
    const formatter = new Intl.DateTimeFormat(getLocale(), {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true, // This will switch between 12-hour and 24-hour format depending on the locale
    });
    return formatter.format(date);
  }
  // less than 7 days ago, display the day of the week + time
  const formatter = new Intl.DateTimeFormat(getLocale(), {
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true, // This will switch between 12-hour and 24-hour format depending on the locale
  });
  return formatter.format(date);
};
