import {
  FormatDistanceStrictOptions,
  formatDistanceStrict,
  format,
  formatRelative,
  FormatDistanceToNowStrictOptions,
  formatDistanceToNowStrict,
} from 'date-fns';
import { getTimeLocaleDictionary, getLocale } from '../shared';

/**
 * Formats a duration in milliseconds into a localized human-readable string.
 *
 * @param durationMs - The duration in milliseconds.
 * @param options - An optional object containing formatting options.
 * @returns A formatted string representing the duration.
 */
export const formatTimeDuration = (
  durationMs: number,
  options?: Omit<FormatDistanceStrictOptions, 'locale'>
) => {
  return formatDistanceStrict(new Date(durationMs), new Date(0), {
    locale: getTimeLocaleDictionary(),
    ...options,
  });
};

export const formatWithLocale = ({ formatStr, date }: { date: Date; formatStr: string }) => {
  return format(date, formatStr, { locale: getTimeLocaleDictionary() });
};

/**
 * Returns a formatted date like `Wednesday, Jun 12, 2024, 4:29 PM`
 */
export const formatFullDate = (date: Date) => {
  return date.toLocaleString(getLocale(), {
    year: 'numeric',
    month: 'short',
    weekday: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
};

export const formatRelativeWithLocale = (timestampMs: number) => {
  return formatRelative(timestampMs, Date.now(), { locale: getTimeLocaleDictionary() });
};

export const formatTimeDistanceToNow = (
  durationSeconds: number,
  options?: Omit<FormatDistanceToNowStrictOptions, 'locale'>
) => {
  return formatDistanceToNowStrict(durationSeconds * 1000, {
    locale: getTimeLocaleDictionary(),
    ...options,
  });
};
