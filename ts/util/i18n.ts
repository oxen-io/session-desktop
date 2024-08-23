// this file is a weird one as it is used by both sides of electron at the same time

import {
  Duration,
  FormatDistanceStrictOptions,
  FormatDistanceToNowStrictOptions,
  format,
  formatDistanceStrict,
  formatDistanceToNow,
  formatDistanceToNowStrict,
  formatDuration,
  formatRelative,
  intervalToDuration,
  isAfter,
  isBefore,
  subDays,
  subMilliseconds,
} from 'date-fns';
import timeLocales from 'date-fns/locale';
import { deSanitizeHtmlTags, sanitizeArgs } from '../components/basic/I18n';
import { LOCALE_DEFAULTS } from '../localization/constants';
import { en } from '../localization/locales';
import { GetNetworkTime } from '../session/apis/snode_api/getNetworkTime';
import { DURATION_SECONDS } from '../session/constants';
import { updateLocale } from '../state/ducks/dictionary';
import {
  ArgsRecord,
  DictionaryWithoutPluralStrings,
  GetMessageArgs,
  LocalizerDictionary,
  LocalizerToken,
  PluralKey,
  PluralString,
  SetupI18nReturnType,
} from '../types/Localizer';

export function loadDictionary(locale: Locale) {
  return import(`../../_locales/${locale}/messages.json`) as Promise<LocalizerDictionary>;
}

const timeLocaleMap = {
  ar: timeLocales.ar,
  be: timeLocales.be,
  bg: timeLocales.bg,
  ca: timeLocales.ca,
  cs: timeLocales.cs,
  da: timeLocales.da,
  de: timeLocales.de,
  el: timeLocales.el,
  en: timeLocales.enUS,
  eo: timeLocales.eo,
  es: timeLocales.es,
  /** TODO - Check this */
  es_419: timeLocales.es,
  et: timeLocales.et,
  fa: timeLocales.faIR,
  fi: timeLocales.fi,
  /** TODO - Check this */
  fil: timeLocales.fi,
  fr: timeLocales.fr,
  he: timeLocales.he,
  hi: timeLocales.hi,
  hr: timeLocales.hr,
  hu: timeLocales.hu,
  /** TODO - Check this */
  'hy-AM': timeLocales.hy,
  id: timeLocales.id,
  it: timeLocales.it,
  ja: timeLocales.ja,
  ka: timeLocales.ka,
  km: timeLocales.km,
  /** TODO - Check this */
  kmr: timeLocales.km,
  kn: timeLocales.kn,
  ko: timeLocales.ko,
  lt: timeLocales.lt,
  lv: timeLocales.lv,
  mk: timeLocales.mk,
  nb: timeLocales.nb,
  nl: timeLocales.nl,
  /** TODO - Find this this */
  no: timeLocales.enUS,
  /** TODO - Find this this */
  pa: timeLocales.enUS,
  pl: timeLocales.pl,
  pt_BR: timeLocales.ptBR,
  pt_PT: timeLocales.pt,
  ro: timeLocales.ro,
  ru: timeLocales.ru,
  /** TODO - Find this this */
  si: timeLocales.enUS,
  sk: timeLocales.sk,
  sl: timeLocales.sl,
  sq: timeLocales.sq,
  sr: timeLocales.sr,
  sv: timeLocales.sv,
  ta: timeLocales.ta,
  th: timeLocales.th,
  /** TODO - Find this this */
  tl: timeLocales.enUS,
  tr: timeLocales.tr,
  uk: timeLocales.uk,
  uz: timeLocales.uz,
  vi: timeLocales.vi,
  zh_CN: timeLocales.zhCN,
  zh_TW: timeLocales.zhTW,
};

export type Locale = keyof typeof timeLocaleMap;

let initialLocale: Locale = 'en';

function getPluralKey<R extends PluralKey | undefined>(string: PluralString): R {
  const match = /{(\w+), plural, one \[.+\] other \[.+\]}/g.exec(string);
  return (match?.[1] ?? undefined) as R;
}

function getStringForCardinalRule(
  localizedString: string,
  cardinalRule: Intl.LDMLPluralRule
): string | undefined {
  // TODO: investigate if this is the best way to handle regex like this
  const cardinalPluralRegex: Record<Intl.LDMLPluralRule, RegExp> = {
    zero: /zero \[(.*?)\]/g,
    one: /one \[(.*?)\]/g,
    two: /two \[(.*?)\]/g,
    few: /few \[(.*?)\]/g,
    many: /many \[(.*?)\]/g,
    other: /other \[(.*?)\]/g,
  };
  const regex = cardinalPluralRegex[cardinalRule];
  const match = regex.exec(localizedString);
  return match?.[1] ?? undefined;
}

const isPluralForm = (localizedString: string): localizedString is PluralString =>
  /{\w+, plural, one \[.+\] other \[.+\]}/g.test(localizedString);

/**
 * Checks if a string contains a dynamic variable.
 * @param localizedString - The string to check.
 * @returns `true` if the string contains a dynamic variable, otherwise `false`.
 *
 * TODO: Change this to a proper type assertion when the type is fixed.
 */
const isStringWithArgs = <R extends DictionaryWithoutPluralStrings[LocalizerToken]>(
  localizedString: string
): localizedString is R => localizedString.includes('{');

/**
 * Logs an i18n message to the console.
 * @param message - The message to log.
 *
 * TODO - Replace this logging method when the new logger is created
 */
function i18nLog(message: string) {
  // eslint:disable: no-console
  // eslint-disable-next-line no-console
  (window?.log?.error ?? console.log)(`i18n: ${message}`);
}

/**
 * Returns the current locale.
 * @param params - An object containing optional parameters.
 * @param params.fallback - The fallback locale to use if redux is not available. Defaults to en.
 */
export function getLocale(): Locale {
  const locale = window?.inboxStore?.getState().dictionary.locale;

  if (locale) {
    return locale;
  }

  if (initialLocale) {
    i18nLog(
      `getLocale: No locale found in redux store but initialLocale provided: ${initialLocale}`
    );

    return initialLocale;
  }

  i18nLog('getLocale: No locale found in redux store. No fallback provided. Using en.');
  return 'en';
}

function getLocaleDictionary() {
  return timeLocaleMap[getLocale()];
}

/**
 * Returns the current dictionary.
 * @param params - An object containing optional parameters.
 * @param params.fallback - The fallback dictionary to use if redux is not available. Defaults to {@link en}.
 */
function getDictionary(params?: { fallback?: LocalizerDictionary }): LocalizerDictionary {
  const dict = window?.inboxStore?.getState().dictionary.dictionary;
  if (dict) {
    return dict;
  }

  if (params?.fallback) {
    i18nLog('getDictionary: No dictionary found in redux store. Using fallback.');
    return params.fallback;
  }

  i18nLog('getDictionary: No dictionary found in redux store. No fallback provided. Using en.');
  return en;
}

/**
 * Sets up the i18n function with the provided locale and messages.
 *
 * @param params - An object containing optional parameters.
 * @param params.initialLocale - The locale to use for translations. Defaults to 'en'.
 * @param params.initialDictionary - A dictionary of localized messages. Defaults to {@link en}.
 *
 * @returns A function that retrieves a localized message string, substituting variables where necessary.
 */
export const setupI18n = (params: {
  initialLocale: Locale;
  initialDictionary: LocalizerDictionary;
}): SetupI18nReturnType => {
  initialLocale = params.initialLocale;
  let initialDictionary = params.initialDictionary;

  if (!initialLocale) {
    initialLocale = 'en';
    i18nLog(`initialLocale not provided in i18n setup. Falling back to ${initialLocale}`);
  }

  if (!initialLocale) {
    initialDictionary = en;
    i18nLog('initialDictionary not provided in i18n setup. Falling back.');
  }

  if (window?.inboxStore) {
    window.inboxStore.dispatch(updateLocale(initialLocale));
    i18nLog('Loaded dictionary dispatch');
  } else {
    i18nLog('No redux store found. Not dispatching dictionary update.');
  }

  /** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.getRawMessage } and {@link window.i18n.getRawMessage } */
  /**
   * Retrieves a localized message string, without substituting any variables. This resolves any plural forms using the given args
   * @param token - The token identifying the message to retrieve.
   * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
   *
   * @returns The localized message string with substitutions applied.
   *
   * NOTE: This is intended to be used to get the raw string then format it with {@link formatMessageWithArgs}
   *
   * @example
   * // The string greeting is 'Hello, {name}!' in the current locale
   * window.i18n.getRawMessage('greeting', { name: 'Alice' });
   * // => 'Hello, {name}!'
   *
   * // The string search is '{count, plural, one [{found_count} of # match] other [{found_count} of # matches]}' in the current locale
   * window.i18n.getRawMessage('search', { count: 1, found_count: 1 });
   * // => '{found_count} of {count} match'
   */
  function getRawMessage<T extends LocalizerToken, R extends DictionaryWithoutPluralStrings[T]>(
    ...[token, args]: GetMessageArgs<T>
  ): R | T {
    try {
      if (window?.sessionFeatureFlags?.replaceLocalizedStringsWithKeys) {
        return token as T;
      }

      const localizedDictionary = getDictionary({ fallback: initialDictionary });

      let localizedString = localizedDictionary[token] as R;

      if (!localizedString) {
        i18nLog(`Attempted to get translation for nonexistent key: '${token}'`);

        localizedString = en[token] as R;

        if (!localizedString) {
          i18nLog(
            `Attempted to get translation for nonexistent key: '${token}' in fallback dictionary`
          );
          return token as T;
        }
      }

      /** If a localized string does not have any arguments to substitute it is returned with no
       * changes. We also need to check if the string contains a curly bracket as if it does
       * there might be a default arg */
      if (!args && !localizedString.includes('{')) {
        return localizedString;
      }

      if (isPluralForm(localizedString)) {
        const pluralKey = getPluralKey(localizedString);

        if (!pluralKey) {
          i18nLog(`Attempted to nonexistent pluralKey for plural form string '${localizedString}'`);
        } else {
          const num = args?.[pluralKey as keyof typeof args] ?? 0;

          const currentLocale = getLocale();
          const cardinalRule = new Intl.PluralRules(currentLocale).select(num);

          const pluralString = getStringForCardinalRule(localizedString, cardinalRule);

          if (!pluralString) {
            i18nLog(`Plural string not found for cardinal '${cardinalRule}': '${localizedString}'`);
            return token as T;
          }

          localizedString = pluralString.replaceAll('#', `${num}`) as R;
        }
      }
      return localizedString;
    } catch (error) {
      i18nLog(error.message);
      return token as T;
    }
  }

  /** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.formatMessageWithArgs } and {@link window.i18n.formatMessageWithArgs } */
  /**
   * Formats a localized message string with arguments and returns the formatted string.
   * @param rawMessage - The raw message string to format. After using @see {@link getRawMessage} to get the raw string.
   * @param args - An optional record of substitution variables and their replacement values. This
   * is required if the string has dynamic variables. This can be optional as a strings args may be defined in @see {@link LOCALE_DEFAULTS}
   *
   * @returns The formatted message string.
   *
   * @example
   * // The string greeting is 'Hello, {name}!' in the current locale
   * window.i18n.getRawMessage('greeting', { name: 'Alice' });
   * // => 'Hello, {name}!'
   * window.i18n.formatMessageWithArgs('greeting', { name: 'Alice' });
   * // => 'Hello, Alice!'
   *
   * // The string search is '{count, plural, one [{found_count} of # match] other [{found_count} of # matches]}' in the current locale
   * window.i18n.getRawMessage('search', { count: 1, found_count: 1 });
   * // => '{found_count} of {count} match'
   * window.i18n.formatMessageWithArgs('search', { count: 1, found_count: 1 });
   * // => '1 of 1 match'
   */
  function formatMessageWithArgs<
    T extends LocalizerToken,
    R extends DictionaryWithoutPluralStrings[T],
  >(rawMessage: R, args?: ArgsRecord<T>): R {
    /** Find and replace the dynamic variables in a localized string and substitute the variables with the provided values */
    // TODO: remove the type casting once we have a proper DictionaryWithoutPluralStrings type
    return (rawMessage as `${string}{${string}}${string}`).replace(
      /\{(\w+)\}/g,
      (match, arg: string) => {
        const matchedArg = args ? args[arg as keyof typeof args] : undefined;

        return (
          matchedArg?.toString() ?? LOCALE_DEFAULTS[arg as keyof typeof LOCALE_DEFAULTS] ?? match
        );
      }
    ) as R;
  }

  /** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.getMessage } and {@link window.i18n } */
  /**
   * Retrieves a localized message string, substituting variables where necessary.
   *
   * @param token - The token identifying the message to retrieve.
   * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
   *
   * @returns The localized message string with substitutions applied.
   *
   * @example
   * // The string greeting is 'Hello, {name}!' in the current locale
   * window.i18n('greeting', { name: 'Alice' });
   * // => 'Hello, Alice!'
   *
   * // The string search is '{count, plural, one [{found_count} of # match] other [{found_count} of # matches]}' in the current locale
   * window.i18n('search', { count: 1, found_count: 1 });
   * // => '1 of 1 match'
   */
  function getMessage<T extends LocalizerToken, R extends LocalizerDictionary[T]>(
    ...[token, args]: GetMessageArgs<T>
  ): R | T {
    try {
      const rawMessage = getRawMessage<T, R>(...([token, args] as GetMessageArgs<T>));

      /** If a localized string does not have any arguments to substitute it is returned with no changes. */
      if (!isStringWithArgs<R>(rawMessage)) {
        return rawMessage;
      }

      return formatMessageWithArgs<T, R>(rawMessage, args as ArgsRecord<T>);
    } catch (error) {
      i18nLog(error.message);
      return token as R;
    }
  }

  /** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.stripped } and {@link window.i18n.stripped } */
  /**
   * Retrieves a localized message string, substituting variables where necessary. Then strips the message of any HTML and custom tags.
   *
   * @param token - The token identifying the message to retrieve.
   * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
   *
   * @returns The localized message string with substitutions applied. Any HTML and custom tags are removed.
   *
   * @example
   * // The string greeting is 'Hello, {name}! <b>Welcome!</b>' in the current locale
   * window.i18n.stripped('greeting', { name: 'Alice' });
   * // => 'Hello, Alice! Welcome!'
   */
  function stripped<T extends LocalizerToken, R extends LocalizerDictionary[T]>(
    ...[token, args]: GetMessageArgs<T>
  ): R | T {
    const sanitizedArgs = args ? sanitizeArgs(args, '\u200B') : undefined;

    const i18nString = getMessage<T, LocalizerDictionary[T]>(
      ...([token, sanitizedArgs] as GetMessageArgs<T>)
    );

    const strippedString = i18nString.replaceAll(/<[^>]*>/g, '');

    return deSanitizeHtmlTags(strippedString, '\u200B') as R;
  }

  /** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.inEnglish } and {@link window.i18n.inEnglish } */
  /**
   * Retrieves a message string in the {@link en} locale, substituting variables where necessary.
   *
   * NOTE: This does not work for plural strings. This function should only be used for debug and
   * non-user-facing strings. Plural string support can be added splitting out the logic for
   * {@link setupI18n.formatMessageWithArgs} and creating a new getMessageFromDictionary, which
   * specifies takes a dictionary as an argument. This is left as an exercise for the reader.
   *
   * @param token - The token identifying the message to retrieve.
   * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
   */
  function inEnglish<T extends LocalizerToken, R extends LocalizerDictionary[T]>(
    ...[token, args]: GetMessageArgs<T>
  ): R | T {
    const rawMessage = en[token] as R;
    if (!rawMessage) {
      i18nLog(
        `Attempted to get forced en string for nonexistent key: '${token}' in fallback dictionary`
      );
      return token as T;
    }
    return formatMessageWithArgs<T, R>(rawMessage, args as ArgsRecord<T>);
  }

  getMessage.inEnglish = inEnglish;
  getMessage.stripped = stripped;
  getMessage.getRawMessage = getRawMessage;
  getMessage.formatMessageWithArgs = formatMessageWithArgs;

  i18nLog(`Setup Complete with locale: ${initialLocale}`);

  return getMessage as SetupI18nReturnType;
};

// eslint-disable-next-line import/no-mutable-exports
export let langNotSupportedMessageShown = false;

export const loadEmojiPanelI18n = async () => {
  if (!window) {
    return undefined;
  }

  const lang = getLocale();
  if (lang !== 'en') {
    try {
      const langData = await import(`@emoji-mart/data/i18n/${lang}.json`);
      return langData;
    } catch (err) {
      if (!langNotSupportedMessageShown) {
        window?.log?.warn(
          'Language is not supported by emoji-mart package. See https://github.com/missive/emoji-mart/tree/main/packages/emoji-mart-data/i18n'
        );
        langNotSupportedMessageShown = true;
      }
    }
  }
  return undefined;
};

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
    locale: getLocaleDictionary(),
    ...options,
  });
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

export const formatWithLocale = ({ formatStr, date }: { date: Date; formatStr: string }) => {
  return format(date, formatStr, { locale: getLocaleDictionary() });
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
  return formatRelative(timestampMs, Date.now(), { locale: getLocaleDictionary() });
};

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
 * Format an expiring/disappearing message timer to its abbreviated form.
 * Note: we don't localize this, and cannot have a value > 4 weeks
 *
 * @param timerSeconds the timer to format, in seconds
 * @returns '1h' for a duration of 3600s.
 */
export const formatAbbreviatedExpireTimer = (timerSeconds: number) => {
  // Note: we keep this function in this file even if it is not localizing anything
  // so we have access to timeLocaleMap.en.

  if (timerSeconds > DURATION_SECONDS.WEEKS * 4) {
    throw new Error('formatAbbreviatedExpireTimer is not design to handle >4 weeks durations ');
  }

  const duration = secondsToDuration(timerSeconds);

  const unlocalized = formatDuration(duration, {
    locale: timeLocaleMap.en, // we want this forced to english
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
  // Note: we keep this function in this file even if it is not localizing anything
  // so we have access to timeLocaleMap.en.

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
    locale: timeLocaleMap.en, // we want this forced to english
    delimiter: '#',
    format,
  });
  return unlocalizedDurationToAbbreviated(unlocalized).split('#');
};

export const formatTimeDistanceToNow = (
  durationSeconds: number,
  options?: Omit<FormatDistanceToNowStrictOptions, 'locale'>
) => {
  return formatDistanceToNowStrict(durationSeconds * 1000, {
    locale: getLocaleDictionary(),
    ...options,
  });
};

export const formatDateDistanceWithOffset = (date: Date): string => {
  const adjustedDate = subMilliseconds(date, GetNetworkTime.getLatestTimestampOffset());
  return formatDistanceToNow(adjustedDate, { addSuffix: true, locale: getLocaleDictionary() });
};

/**
 * Returns a localized string like "Aug 7, 2024 10:03 AM"
 */
export const getDateAndTimeShort = (date: Date) => {
  return formatWithLocale({ date, formatStr: 'Pp' });
};

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

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

// RTL Support

export type HTMLDirection = 'ltr' | 'rtl';

export function isRtlBody(): boolean {
  const body = document.getElementsByTagName('body').item(0);

  return body?.classList.contains('rtl') || false;
}

export const useHTMLDirection = (): HTMLDirection => (isRtlBody() ? 'rtl' : 'ltr');
