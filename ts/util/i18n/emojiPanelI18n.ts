import { getLocale } from './shared';

let langNotSupportedMessageShown = false;

export const loadEmojiPanelI18n = async () => {
  if (!window) {
    return undefined;
  }
  const triedLocales: Array<string> = [];
  const lang = getLocale();
  if (lang !== 'en') {
    try {
      triedLocales.push(lang);
      const langData = await import(`@emoji-mart/data/i18n/${lang}.json`);
      return langData;
    } catch (err) {
      const firstDashIndex = lang.indexOf('-');
      if (firstDashIndex > 0) {
        try {
          const shortenLang = lang.slice(0, firstDashIndex);
          triedLocales.push(shortenLang);
          const langData = await import(`@emoji-mart/data/i18n/${shortenLang}.json`);
          return langData;
        } catch (e) {
          // don't rethrow, we want the log below to be shown
        }
      }

      if (!langNotSupportedMessageShown) {
        window?.log?.warn(
          `Tried locales "${triedLocales}" is not supported by emoji-mart package. See https://github.com/missive/emoji-mart/tree/main/packages/emoji-mart-data/i18n`
        );
        langNotSupportedMessageShown = true;
      }
    }
  }
  return undefined;
};
