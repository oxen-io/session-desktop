// this file is a weird one as it is used by both sides of electron at the same time

import { isEmpty } from 'lodash';
import { LocalizerDictionary, SetupI18nReturnType } from '../../types/Localizer';
import { formatMessageWithArgs } from './functions/formatMessageWithArgs';
import { getMessage } from './functions/getMessage';
import { getRawMessage } from './functions/getRawMessage';
import { inEnglish } from './functions/inEnglish';
import { stripped } from './functions/stripped';
import { i18nLog, Locale, setInitialLocale } from './shared';
import { setTranslationDictionary } from './translationDictionaries';

export function loadDictionary(locale: Locale) {
  return import(`../../_locales/${locale}/messages.json`) as Promise<LocalizerDictionary>;
}

/**
 * Sets up the i18n function with the provided locale and messages.
 *
 * @param params - An object containing optional parameters.
 * @param params.locale - The locale to use for translations
 * @param params.translationDictionary - A dictionary of localized messages. Defaults to {@link en}.
 *
 * @returns A function that retrieves a localized message string, substituting variables where necessary.
 */
export const setupI18n = ({
  locale,
  translationDictionary,
}: {
  locale: Locale;
  translationDictionary: LocalizerDictionary;
}): SetupI18nReturnType => {
  if (!locale) {
    throw new Error(`locale not provided in i18n setup`);
  }

  if (!translationDictionary || isEmpty(translationDictionary)) {
    throw new Error('translationDictionary was not provided');
  }

  setTranslationDictionary(translationDictionary);
  setInitialLocale(locale);

  const getMessageWithFunctions = getMessage;
  // TODO - fix those `any`
  (getMessageWithFunctions as any).inEnglish = inEnglish;
  (getMessageWithFunctions as any).stripped = stripped;
  (getMessageWithFunctions as any).getRawMessage = getRawMessage;
  (getMessageWithFunctions as any).formatMessageWithArgs = formatMessageWithArgs;

  i18nLog(`Setup Complete with locale: ${locale}`);

  return getMessageWithFunctions as SetupI18nReturnType;
};
