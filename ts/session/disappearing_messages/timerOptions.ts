import moment from 'moment';
import { isCI, isDevProd } from '../../shared/env_vars';

type TimerOptionsEntry = { name: string; value: number };
export type TimerOptionsArray = Array<TimerOptionsEntry>;

const timerOptionsDurations: Array<{
  time: number;
  unit: moment.DurationInputArg2;
  seconds: number;
}> = [
  { time: 0, unit: 'seconds' as moment.DurationInputArg2 },
  { time: 5, unit: 'seconds' as moment.DurationInputArg2 },
  { time: 10, unit: 'seconds' as moment.DurationInputArg2 },
  { time: 30, unit: 'seconds' as moment.DurationInputArg2 },
  { time: 1, unit: 'minute' as moment.DurationInputArg2 },
  { time: 5, unit: 'minutes' as moment.DurationInputArg2 },
  { time: 30, unit: 'minutes' as moment.DurationInputArg2 },
  { time: 1, unit: 'hour' as moment.DurationInputArg2 },
  { time: 6, unit: 'hours' as moment.DurationInputArg2 },
  { time: 12, unit: 'hours' as moment.DurationInputArg2 },
  { time: 1, unit: 'day' as moment.DurationInputArg2 },
  { time: 1, unit: 'week' as moment.DurationInputArg2 },
  { time: 2, unit: 'weeks' as moment.DurationInputArg2 },
].map(o => {
  const duration = moment.duration(o.time, o.unit); // 5, 'seconds'
  return {
    time: o.time,
    unit: o.unit,
    seconds: duration.asSeconds(),
  };
});

// TODO - This is copied from the messages.json file as a temporary solution. This will be replaced once time localization is completed.
type TimerOptionKey =
  | 'off'
  | 'timerOption_10_seconds'
  | 'timerOption_10_seconds_abbreviated'
  | 'timerOption_12_hours'
  | 'timerOption_12_hours_abbreviated'
  | 'timerOption_1_day'
  | 'timerOption_1_day_abbreviated'
  | 'timerOption_1_hour'
  | 'timerOption_1_hour_abbreviated'
  | 'timerOption_1_minute'
  | 'timerOption_1_minute_abbreviated'
  | 'timerOption_1_week'
  | 'timerOption_1_week_abbreviated'
  | 'timerOption_2_weeks'
  | 'timerOption_2_weeks_abbreviated'
  | 'timerOption_30_minutes'
  | 'timerOption_30_minutes_abbreviated'
  | 'timerOption_30_seconds'
  | 'timerOption_30_seconds_abbreviated'
  | 'timerOption_5_minutes'
  | 'timerOption_5_minutes_abbreviated'
  | 'timerOption_5_seconds'
  | 'timerOption_5_seconds_abbreviated'
  | 'timerOption_6_hours'
  | 'timerOption_6_hours_abbreviated';

function getTimerOptionName(time: number, unit: moment.DurationInputArg2) {
  return (
    window.i18n(['timerOption', time, unit].join('_') as TimerOptionKey) ||
    moment.duration(time, unit).humanize()
  );
}

function getTimerOptionAbbreviated(time: number, unit: string) {
  return window.i18n(['timerOption', time, unit, 'abbreviated'].join('_') as TimerOptionKey);
}

function getName(seconds = 0) {
  const o = timerOptionsDurations.find(m => m.seconds === seconds);

  if (o) {
    return getTimerOptionName(o.time, o.unit);
  }
  return [seconds, 'seconds'].join(' ');
}

function getAbbreviated(seconds = 0) {
  const o = timerOptionsDurations.find(m => m.seconds === seconds);

  if (o) {
    return getTimerOptionAbbreviated(o.time, o.unit);
  }

  return [seconds, 's'].join('');
}

const VALUES: Array<number> = timerOptionsDurations.map(t => {
  return t.seconds;
});

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
