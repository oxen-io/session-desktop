/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ElementType } from 'react';
import type { Dictionary } from '../localization/locales';
import { LOCALE_DEFAULTS } from '../session/constants';

/** A localization dictionary key */
type Token = keyof Dictionary;

/** A dynamic argument that can be used in a localized string */
type DynamicArg = string | number;

/** A record of dynamic arguments for a specific key in the localization dictionary */
type ArgsRecord<T extends Token> = Record<DynamicArgs<Dictionary[T]>, DynamicArg>;

export type PluralKey = 'count';

export type PluralString = `{${string}, plural, one {${string}} other {${string}}}`;

/** The dynamic arguments in a localized string */
type DynamicArgs<LocalizedString extends string> =
  /** If a string follows the plural format use its plural variable name and recursively check for
   *  dynamic args inside all plural forms */
  LocalizedString extends `{${infer PluralVar}, plural, one {${infer PluralOne}} other {${infer PluralOther}}}`
    ? PluralVar | DynamicArgs<PluralOne> | DynamicArgs<PluralOther>
    : /** If a string segment has follows the variable form parse its variable name and recursively
       * check for more dynamic args */
      LocalizedString extends `${infer _Pre}{${infer Var}}${infer Rest}`
      ? Var | DynamicArgs<Rest>
      : never;

type ArgsRecordExcludingDefaults<T extends Token> = Omit<
  ArgsRecord<T>,
  keyof typeof LOCALE_DEFAULTS
>;

/** The arguments for retrieving a localized message */
export type GetMessageArgs<T extends Token> = T extends Token
  ? DynamicArgs<Dictionary[T]> extends never
    ? [T]
    : ArgsRecordExcludingDefaults<T> extends Record<string, never>
      ? [T]
      : [T, ArgsRecordExcludingDefaults<T>]
  : never;

/** Basic props for all calls of the I18n component */
type I18nBaseProps<T extends Token> = { token: T; as?: ElementType };

/** The props for the localization component */
export type I18nProps<T extends Token> = T extends Token
  ? DynamicArgs<Dictionary[T]> extends never
    ? I18nBaseProps<T>
    : ArgsRecordExcludingDefaults<T> extends Record<string, never>
      ? I18nBaseProps<T>
      : I18nBaseProps<T> & { args: ArgsRecordExcludingDefaults<T> }
  : never;

/** The dictionary of localized strings */
export type LocalizerDictionary = Dictionary;

/** A localization dictionary key */
export type LocalizerToken = keyof LocalizerDictionary;
