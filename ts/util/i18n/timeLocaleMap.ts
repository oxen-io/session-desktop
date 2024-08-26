import timeLocales from 'date-fns/locale';

// Note: to find new mapping you can use:
// https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes

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
  'es-419': timeLocales.es,
  et: timeLocales.et,
  fa: timeLocales.faIR,
  fi: timeLocales.fi,
  fil: timeLocales.fi,
  fr: timeLocales.fr,
  he: timeLocales.he,
  hi: timeLocales.hi,
  hr: timeLocales.hr,
  hu: timeLocales.hu,
  'hy-AM': timeLocales.hy,
  id: timeLocales.id,
  it: timeLocales.it,
  ja: timeLocales.ja,
  ka: timeLocales.ka,
  km: timeLocales.km,
  kmr: timeLocales.km, // central khmer, mapped to date-fns khmer: km
  kn: timeLocales.kn,
  ko: timeLocales.ko,
  lt: timeLocales.lt,
  lv: timeLocales.lv,
  mk: timeLocales.mk,
  nb: timeLocales.nb, // Norwegian Bokmål, mapped to date-fns "Norwegian Bokmål": nb
  nl: timeLocales.nl, // dutch/flemish
  no: timeLocales.nb, // norwegian, mapped to date-fns "Norwegian Bokmål": nb
  pa: timeLocales.hi, // punjabi: not supported by date-fns, mapped to Hindi: hi
  pl: timeLocales.pl,
  'pt-BR': timeLocales.ptBR,
  'pt-PT': timeLocales.pt,
  ro: timeLocales.ro,
  ru: timeLocales.ru,
  si: timeLocales.enUS, // sinhala, not suported by date-fns, mapped to english for now
  sk: timeLocales.sk,
  sl: timeLocales.sl,
  sq: timeLocales.sq,
  sr: timeLocales.sr,
  sv: timeLocales.sv,
  ta: timeLocales.ta,
  th: timeLocales.th,
  tl: timeLocales.enUS, // tagalog, not suported by date-fns, mapped to english for now
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
