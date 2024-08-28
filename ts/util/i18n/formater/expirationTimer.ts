import { Duration, formatDuration, intervalToDuration } from 'date-fns';
import { DURATION_SECONDS } from '../../../session/constants';
import { getForcedEnglishTimeLocale } from '../timeLocaleMap';

/**
 * We decided against localizing the abbreviated durations like 1h, 1m, 1s as most apps don't.
 * This function just replaces any long form of "seconds?" to "s", "minutes?" to "m", etc.
 *
 * Note:
 *  We don't replace to 'months' as it would be the same as 'minutes', so this function shouldn't be used for a string containing months or longer units in it.
 *
 *  Date-fns also doesn't support the 'narrow' syntax for formatDistanceStrict and even if it did, minutes are abbreviated as 'min' in english.
 *
 * @param unlocalized the string containing the units to abbreviate
 * @returns the string with abbreviated units
 */
const unlocalizedDurationToAbbreviated = (unlocalized: string): string => {
  return unlocalized
    .replace(/ weeks?/g, 'w')
    .replace(/ days?/g, 'd')
    .replace(/ hours?/g, 'h')
    .replace(/ minutes?/g, 'm')
    .replace(/ seconds?/g, 's');
};

/**
 * date-fns `intervalToDuration` takes a duration in ms.
 * This is a simple wrapper to avoid duplicating this (and not forget about it).
 *
 * Note:
 *  - date-fns intervalToDuration returns doesn't return 2w for 14d and such, so this forces it to be used.
 *  - this will throw if the duration is > 4 weeks
 *
 * @param seconds the seconds to get the durations from
 * @returns a date-fns `Duration` type with the fields set
 */
const secondsToDuration = (seconds: number): Duration => {
  if (seconds > 3600 * 24 * 28) {
    throw new Error('secondsToDuration cannot handle more than 4 weeks for now');
  }
  const duration = intervalToDuration({ start: 0, end: new Date(seconds * 1000) });

  if (!duration) {
    throw new Error('intervalToDuration failed to convert duration');
  }

  if (duration.days) {
    duration.weeks = Math.floor(duration.days / 7);
    duration.days %= 7;
  }

  return duration;
};

/**
 * Format an expiring/disappearing message timer to its abbreviated form.
 * Note: we don't localize this, and cannot have a value > 4 weeks
 *
 * @param timerSeconds the timer to format, in seconds
 * @returns '1h' for a duration of 3600s.
 */
export const formatAbbreviatedExpireTimer = (timerSeconds: number) => {
  if (timerSeconds > DURATION_SECONDS.WEEKS * 4) {
    throw new Error('formatAbbreviatedExpireTimer is not design to handle >4 weeks durations ');
  }
  if (timerSeconds <= 0) {
    return window.i18n('off');
  }

  const duration = secondsToDuration(timerSeconds);

  const unlocalized = formatDuration(duration, {
    locale: getForcedEnglishTimeLocale(), // we want this forced to english
  });

  return unlocalizedDurationToAbbreviated(unlocalized);
};

/**
 * Format an expiring/disappearing message timer to its abbreviated form.
 * Note: we don't localize this, and cannot have a value > 4 weeks
 *
 * @param timerSeconds the timer to format, in seconds
 * @returns '1h' for a duration of 3600s.
 */
export const formatAbbreviatedExpireDoubleTimer = (timerSeconds: number) => {
  if (timerSeconds > DURATION_SECONDS.WEEKS * 4) {
    throw new Error(
      'formatAbbreviatedExpireDoubleTimer is not design to handle >4 weeks durations '
    );
  }
  if (timerSeconds <= 0) {
    return ['0s'];
  }

  const duration = secondsToDuration(timerSeconds);

  const format: Array<keyof Duration> = [];
  if (duration.months || duration.years) {
    throw new Error("we don't support years or months to be !== 0");
  }
  if (duration.weeks && format.length < 2) {
    format.push('weeks');
  }
  if (duration.days && format.length < 2) {
    format.push('days');
  }
  if (duration.hours && format.length < 2) {
    format.push('hours');
  }
  if (duration.minutes && format.length < 2) {
    format.push('minutes');
  }
  if (duration.seconds && format.length < 2) {
    format.push('seconds');
  }

  const unlocalized = formatDuration(duration, {
    locale: getForcedEnglishTimeLocale(), // we want this forced to english
    delimiter: '#',
    format,
  });
  return unlocalizedDurationToAbbreviated(unlocalized).split('#');
};
