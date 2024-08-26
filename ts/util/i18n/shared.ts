import { timeLocaleMap } from './timeLocaleMap';

let mappedBrowserLocaleDisplayed = false;
let initialLocale: Locale | undefined;

/**
 * Logs an i18n message to the console.
 * @param message - The message to log.
 *
 */
export function i18nLog(message: string) {
  // eslint:disable: no-console
  // eslint-disable-next-line no-console
  (window?.log?.info ?? console.log)(`i18n: ${message}`);
}

export type Locale = keyof typeof timeLocaleMap;

export function getTimeLocaleDictionary() {
  return timeLocaleMap[getLocale()];
}

/**
 * Returns the current locale.
 */
export function getLocale(): Locale {
  if (!initialLocale) {
    i18nLog(`getLocale: using initialLocale: ${initialLocale}`);

    throw new Error('initialLocale is unset');
  }
  return initialLocale;
}

/**
 * Returns the closest supported locale by the browser.
 */
export function getBrowserLocale() {
  const userLocaleDashed = getLocale();

  const matchinglocales = Intl.DateTimeFormat.supportedLocalesOf(userLocaleDashed);
  const mappingTo = matchinglocales?.[0] || 'en';

  if (!mappedBrowserLocaleDisplayed) {
    mappedBrowserLocaleDisplayed = true;
    i18nLog(`userLocaleDashed: '${userLocaleDashed}', mapping to browser locale: ${mappingTo}`);
  }

  return mappingTo;
}

export function setInitialLocale(locale: Locale) {
  initialLocale = locale;
}
