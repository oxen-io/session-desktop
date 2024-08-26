import timeLocales from 'date-fns/locale';

export const timeLocaleMap = {
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
  'es-419': timeLocales.es,
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
  'pt-BR': timeLocales.ptBR,
  'pt-PT': timeLocales.pt,
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
  'zh-CN': timeLocales.zhCN,
  'zh-TW': timeLocales.zhTW,
};

export function getForcedEnglishTimeLocale() {
  return timeLocaleMap.en;
}
