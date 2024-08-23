import { timeLocaleMap } from './timeLocaleMap';

/**
 * Logs an i18n message to the console.
 * @param message - The message to log.
 *
 * TODO - Replace this logging method when the new logger is created
 */
export function i18nLog(message: string) {
  // eslint:disable: no-console
  // eslint-disable-next-line no-console
  (window?.log?.error ?? console.log)(`i18n: ${message}`);
}

export type Locale = keyof typeof timeLocaleMap;

export function getTimeLocaleDictionary() {
  return timeLocaleMap[getLocale()];
}

/**
 * Returns the current locale.
 * @param params - An object containing optional parameters.
 * @param params.fallback - The fallback locale to use if redux is not available. Defaults to en.
 */
export function getLocale(): Locale {
  if (!initialLocale) {
    i18nLog(`getLocale: using initialLocale: ${initialLocale}`);

    throw new Error('initialLocale is unset');
  }
  return initialLocale;
}

let initialLocale: Locale | undefined;

export function setInitialLocale(locale: Locale) {
  initialLocale = locale;
}
