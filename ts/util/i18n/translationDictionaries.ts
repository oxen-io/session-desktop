import { en } from '../../localization/locales';
import type { LocalizerDictionary } from '../../types/Localizer';
import { i18nLog } from './shared';

let translationDictionary: LocalizerDictionary | undefined;

export function setTranslationDictionary(dictionary: LocalizerDictionary) {
  if (translationDictionary) {
    throw new Error('translationDictionary is already init');
  }
  translationDictionary = dictionary;
}

/**
 * Only exported for testing, reset the dictionary to use for translations.
 */
export function resetTranslationDictionary() {
  translationDictionary = undefined;
}

/**
 * Returns the current dictionary to use for translations.
 */
export function getTranslationDictionary(): LocalizerDictionary {
  if (translationDictionary) {
    return translationDictionary;
  }

  i18nLog('getTranslationDictionary: dictionary not init yet. Using en.');
  return en;
}
