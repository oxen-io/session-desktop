import { isCI, isDevProd } from '../../shared/env_vars';
import { formatAbbreviatedExpireTimer, formatTimeDuration } from '../../util/i18n';
import { DURATION_SECONDS } from '../constants';

type TimerOptionsEntry = { name: string; value: number };
export type TimerOptionsArray = Array<TimerOptionsEntry>;

const VALUES: Array<number> = [
  /** off */
  0,
  /** 5 seconds */
  5 * DURATION_SECONDS.SECONDS,
  /** 10 seconds */
  10 * DURATION_SECONDS.SECONDS,
  /** 30 seconds */
  30 * DURATION_SECONDS.SECONDS,
  /** 1 minute */
  1 * DURATION_SECONDS.MINUTES,
  /** 5 minutes */
  5 * DURATION_SECONDS.MINUTES,
  /** 30 minutes */
  30 * DURATION_SECONDS.MINUTES,
  /** 1 hour */
  1 * DURATION_SECONDS.HOURS,
  /** 6 hours */
  6 * DURATION_SECONDS.HOURS,
  /** 12 hours */
  12 * DURATION_SECONDS.HOURS,
  /** 1 day */
  1 * DURATION_SECONDS.DAYS,
  /** 1 week */
  1 * DURATION_SECONDS.WEEKS,
  /** 2 weeks */
  2 * DURATION_SECONDS.WEEKS,
];

function getName(seconds = 0) {
  if (seconds >= 0) {
    return formatTimeDuration(seconds * 1000);
  }

  return [seconds, 'seconds'].join(' ');
}

function getAbbreviated(seconds = 0) {
  if (seconds >= 0) {
    return formatAbbreviatedExpireTimer(seconds);
  }

  return [seconds, 's'].join('');
}

const filterOutDebugValues = (option: number) => {
  return isDevProd() || isCI() || option > 60; // when not a dev build nor on CI, filter out options with less than 60s
};

const DELETE_AFTER_READ = VALUES.filter(option => {
  return (
    option === 10 || // 10 seconds: filtered out when app is packaged with filterOutDebugValues
    option === 30 || // 30 seconds: filtered out when app is packaged with filterOutDebugValues
    option === 60 || // 1 minute  : filtered out when app is packaged with filterOutDebugValues
    option === 300 || // 5 minutes
    option === 3600 || // 1 hour
    option === 43200 || // 12 hours
    option === 86400 || // 1 day
    option === 604800 || // 1 week
    option === 1209600 // 2 weeks
  );
}).filter(filterOutDebugValues);

const DELETE_AFTER_SEND = VALUES.filter(option => {
  return (
    option === 10 || // 10 seconds: filtered out when app is packaged with filterOutDebugValues
    option === 30 || // 30 seconds: filtered out when app is packaged with filterOutDebugValues
    option === 60 || // 1 minute  : filtered out when app is packaged with filterOutDebugValues
    option === 43200 || // 12 hours
    option === 86400 || // 1 day
    option === 604800 || // 1 week
    option === 1209600 // 2 weeks
  );
}).filter(filterOutDebugValues);

// TODO legacy messages support will be removed in a future release
const DELETE_LEGACY = VALUES.filter(option => {
  return (
    option === 10 || // 10 seconds: filtered out when app is packaged with filterOutDebugValues
    option === 30 || // 30 seconds: filtered out when app is packaged with filterOutDebugValues
    option === 60 || // 1 minute  : filtered out when app is packaged with filterOutDebugValues
    option === 43200 || // 12 hours
    option === 86400 || // 1 day
    option === 604800 || // 1 week
    option === 1209600 // 2 weeks
  );
}).filter(filterOutDebugValues);

const DEFAULT_OPTIONS = {
  DELETE_AFTER_READ: 43200, // 12 hours
  DELETE_AFTER_SEND: 86400, // 1 day
  // TODO legacy messages support will be removed in a future release
  LEGACY: 86400, // 1 day
};

export const TimerOptions = {
  DEFAULT_OPTIONS,
  VALUES,
  DELETE_AFTER_READ,
  DELETE_AFTER_SEND,
  DELETE_LEGACY,
  getName,
  getAbbreviated,
};
