import fs from 'fs';
import path from 'path';
import { isEmpty } from 'lodash';
import type { LocalizerDictionary, SetupI18nReturnType } from '../types/localizer';
import { getAppRootPath } from './getRootPath';
import { en } from '../localization/locales';
import { setupI18n } from '../util/i18n/i18n';
import { CrowdinLocale } from '../localization/constants';

export function normalizeLocaleName(locale: string) {
  const dashedLocale = locale.replaceAll('_', '-');

  // Note: this is a pain, but we somehow needs to keep in sync this logic and the LOCALE_PATH_MAPPING from
  // https://github.com/oxen-io/session-shared-scripts/blob/main/crowdin/generate_desktop_strings.py
  // What we do, is keep as is, anything given in LOCALE_PATH_MAPPING, but otherwise, keep only the first part of the locale.
  // So `es-419` is allowed, but `es-es` is hardcoded to es, fr_FR is hardcoded to fr, and so on.
  if (
    /^es-419/.test(dashedLocale) ||
    /^hy-AM/.test(dashedLocale) ||
    /^kmr-TR/.test(dashedLocale) ||
    /^pt-BR/.test(dashedLocale) ||
    /^pt-PT/.test(dashedLocale) ||
    /^zh-CN/.test(dashedLocale) ||
    /^zh-TW/.test(dashedLocale)
  ) {
    return dashedLocale;
  }
  const firstDash = dashedLocale.indexOf('-');
  if (firstDash > 0) {
    return dashedLocale.slice(0, firstDash);
  }
  return dashedLocale;
}

function getLocaleMessages(locale: string): LocalizerDictionary {
  if (locale.includes('_')) {
    throw new Error(
      "getLocaleMessages: expected locale to not have a '_' in it. Those should have been replaced to -"
    );
  }

  const targetFile = path.join(getAppRootPath(), '_locales', locale, 'messages.json');

  return JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
}

export function loadLocalizedDictionary({
  appLocale,
  logger,
}: {
  appLocale: string;
  logger?: any;
}): {
  crowdinLocale: CrowdinLocale;
  i18n: SetupI18nReturnType;
} {
  if (!appLocale) {
    throw new TypeError('`appLocale` is required');
  }

  if (!logger || !logger.error) {
    throw new TypeError('`logger.error` is required');
  }

  // Load locale - if we can't load messages for the current locale, we
  // default to 'en'
  //
  // possible locales:
  // https://github.com/electron/electron/blob/master/docs/api/locales.md
  let crowdinLocale = normalizeLocaleName(appLocale) as CrowdinLocale;
  let translationDictionary;

  try {
    translationDictionary = getLocaleMessages(crowdinLocale);
  } catch (e) {
    logger.error(`Problem loading messages for locale ${crowdinLocale} ${e.stack}`);
    logger.error('Falling back to en locale');
  }

  if (!translationDictionary || isEmpty(translationDictionary)) {
    translationDictionary = en;
    crowdinLocale = 'en';
  }

  const i18n = setupI18n({
    crowdinLocale,
    translationDictionary,
  });

  return {
    crowdinLocale,
    i18n,
  };
}
