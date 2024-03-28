// this file is a weird one as it is used by both sides of electron at the same time

import { isUndefined } from 'lodash';
import { GetMessageArgs, LocalizerDictionary, LocalizerToken } from '../types/Localizer';

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
export const setupi18n = (locale: string, dictionary: LocalizerDictionary) => {
  if (!locale) {
    throw new Error('i18n: locale parameter is required');
  }
  if (!dictionary) {
    throw new Error('i18n: messages parameter is required');
  }

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
    const localizedString = dictionary[token];

    if (!localizedString) {
      i18nLog(`i18n: Attempted to get translation for nonexistent key '${token}'`);
      return '' as R;
    }

    /** If a localized string does not have any arguments to substitute it is retured with no changes */
    if (!args) {
      return localizedString as R;
    }

    /** Find and replace the dynamic variables in a localized string and substitute the variables with the provided values */
    return localizedString.replace(/\{(\w+)\}/g, (match, arg: keyof typeof args) => {
      const substitution = args[arg];
      /** If a substitution is undefined we return the variable match */
      return isUndefined(substitution) ? match : substitution.toString();
    }) as R;
  }

  getMessage.getLocale = () => locale;

  return getMessage;
};

// eslint-disable-next-line import/no-mutable-exports
export let langNotSupportedMessageShown = false;

export const loadEmojiPanelI18n = async () => {
  if (!window) {
    return undefined;
  }

  const lang = (window.i18n as any).getLocale();
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

// RTL Support

export type HTMLDirection = 'ltr' | 'rtl';

export function isRtlBody(): boolean {
  const body = document.getElementsByTagName('body').item(0);

  return body?.classList.contains('rtl') || false;
}

export const useHTMLDirection = (): HTMLDirection => (isRtlBody() ? 'rtl' : 'ltr');
