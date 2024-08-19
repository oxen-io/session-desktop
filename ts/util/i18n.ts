// this file is a weird one as it is used by both sides of electron at the same time

import {
  Duration,
  FormatDistanceStrictOptions,
  FormatDistanceToNowStrictOptions,
  formatDistanceStrict,
  formatDistanceToNow,
  formatDistanceToNowStrict,
  formatDuration,
  intervalToDuration,
  subMilliseconds,
} from 'date-fns';
import timeLocales from 'date-fns/locale';
import { isUndefined } from 'lodash';
import { GetNetworkTime } from '../session/apis/snode_api/getNetworkTime';
import { DURATION_SECONDS, LOCALE_DEFAULTS } from '../session/constants';
import { updateLocale } from '../state/ducks/dictionary';
import {
  DictionaryWithoutPluralStrings,
  GetMessageArgs,
  LocalizerDictionary,
  LocalizerToken,
  PluralKey,
  PluralString,
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
 * Logs an i18n message to the console.
 * @param message - The message to log.
 *
 * TODO - Replace this logging method when the new logger is created
 */
function i18nLog(message: string) {
  // eslint:disable: no-console
  // eslint-disable-next-line no-console
  (window?.log?.error ?? console.log)(message);
}

/**
 * Sets up the i18n function with the provided locale and messages.
 *
 * @param locale - The locale to use for translations.
 * @param dictionary - A dictionary of localized messages.
 *
 * @returns A function that retrieves a localized message string, substituting variables where necessary.
 */
export const setupi18n = (locale: Locale, dictionary: LocalizerDictionary) => {
  if (!locale) {
    throw new Error('i18n: locale parameter is required');
  }

  if (!dictionary) {
    throw new Error('i18n: messages parameter is required');
  }

  if (window.inboxStore) {
    window.inboxStore.dispatch(updateLocale(locale));
    window.log.info('Loaded dictionary dispatch');
  }
  window.log.info('i18n setup');

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
   */
  function getMessage<T extends LocalizerToken, R extends LocalizerDictionary[T]>(
    ...[token, args]: GetMessageArgs<T>
  ): R {
    try {
      const {
        inboxStore,
        sessionFeatureFlags: { replaceLocalizedStringsWithKeys },
      } = window;

      if (replaceLocalizedStringsWithKeys) {
        return token as R;
      }

      const storedDictionary =
        inboxStore && 'getState' in inboxStore && typeof inboxStore.getState === 'function'
          ? (inboxStore.getState().dictionary.dictionary as LocalizerDictionary)
          : undefined;

      if (!storedDictionary) {
        i18nLog(`i18n: Stored dictionary not found, using setup dictionary as fallback`);
      }

      const localizedDictionary = storedDictionary ?? dictionary;

      let localizedString = localizedDictionary[token] as R;

      if (!localizedString) {
        i18nLog(`i18n: Attempted to get translation for nonexistent key '${token}'`);
        return token as R;
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
          i18nLog(
            `i18n: Attempted to nonexistent pluralKey for plural form string '${localizedString}'`
          );
        } else {
          const num = args?.[pluralKey as keyof typeof args] ?? 0;

          const cardinalRule = new Intl.PluralRules(locale).select(num);

          const pluralString = getStringForCardinalRule(localizedString, cardinalRule);

          if (!pluralString) {
            i18nLog(
              `i18n: Plural string not found for cardinal '${cardinalRule}': '${localizedString}'`
            );
            return token as R;
          }

          localizedString = pluralString.replaceAll('#', `${num}`) as R;
        }
      }

      /** Find and replace the dynamic variables in a localized string and substitute the variables with the provided values */
      return (localizedString as DictionaryWithoutPluralStrings[T]).replace(
        /\{(\w+)\}/g,
        (match, arg) => {
          const substitution: string | undefined = args?.[arg as keyof typeof args];

          if (isUndefined(substitution)) {
            const defaultSubstitution = LOCALE_DEFAULTS[arg as keyof typeof LOCALE_DEFAULTS];

            return isUndefined(defaultSubstitution) ? match : defaultSubstitution;
          }

          // TODO: figure out why is was type never and fix the type
          return (substitution as string).toString();
        }
      ) as R;
    } catch (error) {
      i18nLog(`i18n: ${error.message}`);
      return token as R;
    }
  }

  window.getLocale = () => locale;

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
  getMessage.stripped = <T extends LocalizerToken, R extends LocalizerDictionary[T]>(
    ...[token, args]: GetMessageArgs<T>
  ): R => {
    const i18nString = getMessage<T, LocalizerDictionary[T]>(
      ...([token, args] as GetMessageArgs<T>)
    );

    return i18nString.replaceAll(/<[^>]*>/g, '') as R;
  };

  return getMessage;
};

export const getI18nFunction = (stripTags: boolean) => {
  return stripTags ? window.i18n.stripped : window.i18n;
};

// eslint-disable-next-line import/no-mutable-exports
export let langNotSupportedMessageShown = false;

export const loadEmojiPanelI18n = async () => {
  if (!window) {
    return undefined;
  }

  const lang = window.getLocale();
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

export const formatTimeDistance = (
  durationSeconds: number,
  baseDate: Date = new Date(0),
  options?: Omit<FormatDistanceStrictOptions, 'locale'>
) => {
  const locale = window.getLocale();

  return formatDistanceStrict(new Date(durationSeconds * 1000), baseDate, {
    locale: timeLocaleMap[locale],
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
    locale: timeLocaleMap.en,
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
    locale: timeLocaleMap.en,
    delimiter: '#',
    format,
  });
  return unlocalizedDurationToAbbreviated(unlocalized).split('#');
};

export const formatTimeDistanceToNow = (
  durationSeconds: number,
  options?: Omit<FormatDistanceToNowStrictOptions, 'locale'>
) => {
  const locale = window.getLocale();
  return formatDistanceToNowStrict(durationSeconds * 1000, {
    locale: timeLocaleMap[locale],
    ...options,
  });
};

export const formatDateDistanceWithOffset = (date: Date): string => {
  const locale = window.getLocale();
  const adjustedDate = subMilliseconds(date, GetNetworkTime.getLatestTimestampOffset());
  return formatDistanceToNow(adjustedDate, { addSuffix: true, locale: timeLocaleMap[locale] });
};

// RTL Support

export type HTMLDirection = 'ltr' | 'rtl';

export function isRtlBody(): boolean {
  const body = document.getElementsByTagName('body').item(0);

  return body?.classList.contains('rtl') || false;
}

export const useHTMLDirection = (): HTMLDirection => (isRtlBody() ? 'rtl' : 'ltr');
