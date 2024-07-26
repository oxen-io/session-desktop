type Logger = typeof window.log | typeof console;
type LogLevel = keyof Logger;

/**
 * Create a new TimedLog instance. A logging method can be called later to log a message with an elapsed time.
 *
 * When an instance of this class is created it will save the current time in itself and use that time to compute the elapsed time when a logging method is called on it.
 *
 * @example
 * const timedLog = new TimedLog();
 * timedLog.debug('A message was sent with id 7');
 * // Output: A message was sent with id 7: 1.923s
 *
 * @example
 * const timedLog = new TimedLog();
 * timedLog.debug('A message was sent after {time} with id 7');
 * // Output: A message was sent after 1.923s with id 7
 */
export class TimedLog {
  private start: number = Date.now();
  private logger: Logger;

  private static timeAppendPrefix = ':';
  private static millisecondSuffix = 'ms';
  private static secondSuffix = 's';

  constructor(initialLogMessage?: string, initialLogMessageLevel?: keyof Logger) {
    if (typeof window === 'undefined') {
      this.logger = console;
    } else {
      this.logger = window.log;
    }
    if (initialLogMessage) {
      this.log(initialLogMessageLevel ?? 'debug', initialLogMessage);
    }
  }

  /**
   * Reset the timer to the current time.
   *
   * @example
   * const timedLog = new TimedLog();
   * timedLog.debug('A message was sent with id 7');
   * // Output: A message was sent with id 7: 1.923s
   * timedLog.resetTimer();
   * timedLog.debug('A message was sent with id 8');
   * // Output: A message was sent with id 8: 2.318s
   */
  public resetTimer() {
    this.start = Date.now();
  }

  /**
   * Format the time elapsed since the start of the timer.
   * @param time The time to format.
   * @returns The formatted time.
   */
  public static formatDistanceToNow(time: number) {
    const ms = Date.now() - Math.floor(time);
    const s = Math.floor(ms / 1000);
    if (s === 0) {
      return `${ms}${TimedLog.millisecondSuffix}`;
    }

    if (ms === 0) {
      return `${s}${TimedLog.secondSuffix}`;
    }

    function formatMillisecondsToSeconds(milliseconds: number): string {
      const seconds = milliseconds / 1000;
      return seconds.toFixed(3).replace(/\.?0+$/, '');
    }

    return `${formatMillisecondsToSeconds(ms)}${TimedLog.secondSuffix}`;
  }

  /**
   * Format a message with the time elapsed since the start of the timer.
   * If the message contains a placeholder {*}, the placeholder will be replaced with the time passed.
   * Otherwise the time passed will be added to the end of the message, separated by a separator or ': ' by default.
   *
   * @param data The message to replace the time in.
   * @returns The message with the time replaced.
   */
  private writeTimeToLog(...data: Array<any>) {
    const time = TimedLog.formatDistanceToNow(this.start);

    const includesTemplate = data.some(arg => typeof arg === 'string' && /\{.*\}/.test(arg));

    if (!includesTemplate) {
      return [...data, TimedLog.timeAppendPrefix, time];
    }

    return data.map(arg =>
      typeof arg === 'string' && /\{.*\}/.test(arg) ? arg.replace(/\{.*\}/g, time) : arg
    );
  }

  /**
   * Log a message at the given level.
   *
   * @param level The level to log at.
   * @param message The message to log.
   */
  private log(level: LogLevel, ...data: Array<any>) {
    this.logger[level](...this.writeTimeToLog(...data));
  }

  /**
   * Log a message at the debug level with the elapsed time.
   *
   * If the message contains a placeholder {*}, the placeholder will be replaced with the time passed.
   * Otherwise the time passed will be added to the end of the message.
   *
   * @param message The message to log at the debug level.
   *
   * @see {@link initTimedLog} to create a new TimedLog instance.
   *
   * @example
   * const timedLog = initTimedLog();
   * timedLog.debug('A message was sent with id 7');
   * // Output: A message was sent with id 7: 1.923s
   *
   * @example
   * const timedLog = initTimedLog();
   * timedLog.debug('A message was sent after {time} with id 7');
   * // Output: A message was sent after 1.923s with id 7
   */
  public debug(...data: Array<any>) {
    this.log('debug', ...data);
  }

  /**
   * Log a message at the info level with the elapsed time.
   *
   * If the message contains a placeholder {*}, the placeholder will be replaced with the time passed.
   * Otherwise the time passed will be added to the end of the message.
   *
   * @param message The message to log at the debug level.
   *
   * @see {@link initTimedLog} to create a new TimedLog instance.
   *
   * @example
   * const timedLog = initTimedLog();
   * timedLog.info('A message was sent with id 7');
   * // Output: A message was sent with id 7: 1.923s
   *
   * @example
   * const timedLog = initTimedLog();
   * timedLog.info('A message was sent after {time} with id 7');
   * // Output: A message was sent after 1.923s with id 7
   */
  public info(...data: Array<any>) {
    this.log('info', ...data);
  }

  /**
   * Log a message at the warn level with the elapsed time.
   *
   * If the message contains a placeholder {*}, the placeholder will be replaced with the time passed.
   * Otherwise the time passed will be added to the end of the message.
   *
   * @param message The message to log at the debug level.
   *
   * @see {@link initTimedLog} to create a new TimedLog instance.
   *
   * @example
   * const timedLog = initTimedLog();
   * timedLog.warn('A message was sent with id 7');
   * // Output: A message was sent with id 7: 1.923s
   *
   * @example
   * const timedLog = initTimedLog();
   * timedLog.warn('A message was sent after {time} with id 7');
   * // Output: A message was sent after 1.923s with id 7
   */
  public warn(...data: Array<any>) {
    this.log('warn', ...data);
  }

  /**
   * Log a message at the error level with the elapsed time.
   *
   * If the message contains a placeholder {*}, the placeholder will be replaced with the time passed.
   * Otherwise the time passed will be added to the end of the message.
   *
   * @param message The message to log at the debug level.
   *
   * @see {@link initTimedLog} to create a new TimedLog instance.
   *
   * @example
   * const timedLog = initTimedLog();
   * timedLog.error('A message was sent with id 7');
   * // Output: A message was sent with id 7: 1.923s
   *
   * @example
   * const timedLog = initTimedLog();
   * timedLog.error('A message was sent after {time} with id 7');
   * // Output: A message was sent after 1.923s with id 7
   */
  public error(...data: Array<any>) {
    this.log('error', ...data);
  }
}

export type TimedLogInstance = TimedLog;

/**
 * Create a new TimedLog instance. This can be called later to log a message with an elapsed time.
 * @returns A new TimedLog instance.
 *
 * @see {@link TimedLog} for more information on how to use the returned instance.
 *
 * @example
 * const timedLog = TimedLog();
 * timer.debug('A message was sent with id 7');
 * // Output: A message was sent with id 7: 1.923s
 *
 * @example
 * const timedLog = TimedLog();
 * timer.info('A message was sent after {time} with id 7');
 * // Output: A message was sent after 1.923s with id 7
 */
export const initTimedLog = () => {
  return new TimedLog();
};

/**
 * Create a new TimedLog instance. This can be called later to log a message with an elapsed time.
 * @param initialLogMessage The message to log when the instance is created.
 * @param initialLogMessageLevel The level to log the initial message at.
 * @returns A new TimedLog instance.
 *
 * @see {@link TimedLog} for more information on how to use the returned instance.
 *
 * @example
 * const timedLog = TimedLog('A message is being sent with id 7');
 * // Output: A message is being sent with id 7
 * timer.debug('A message was sent with id 7');
 * // Output: A message was sent with id 7: 1.923s
 *
 * @example
 * const timedLog = TimedLog('A message is being sent with id 7', 'info');
 * // Output: A message is being sent with id 7
 * timer.info('A message was sent after {time} with id 7');
 * // Output: A message was sent after 1.923s with id 7
 */
export const initTimedLogWithInitialLog = (
  initialLogMessage: string,
  initialLogMessageLevel: keyof Logger = 'debug'
) => {
  return new TimedLog(initialLogMessage, initialLogMessageLevel);
};
