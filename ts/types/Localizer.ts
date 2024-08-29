/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ElementType } from 'react';
import type { Dictionary } from '../localization/locales';
import type { LOCALE_DEFAULTS } from '../localization/constants';

/** The dictionary of localized strings */
export type LocalizerDictionary = Dictionary;

/** A localization dictionary key */
export type LocalizerToken = keyof Dictionary;

/** A dynamic argument that can be used in a localized string */
export type DynamicArg = string | number;

/** A record of dynamic arguments for a specific key in the localization dictionary */
export type ArgsRecord<T extends LocalizerToken> = Record<DynamicArgs<Dictionary[T]>, DynamicArg>;

// TODO: create a proper type for this
export type DictionaryWithoutPluralStrings = Dictionary;
export type PluralKey = 'count';
export type PluralString = `{${string}, plural, one [${string}] other [${string}]}`;

/** The dynamic arguments in a localized string */
type DynamicArgs<LocalizedString extends string> =
  /** If a string follows the plural format use its plural variable name and recursively check for
   *  dynamic args inside all plural forms */
  LocalizedString extends `{${infer PluralVar}, plural, one [${infer PluralOne}] other [${infer PluralOther}]}`
    ? PluralVar | DynamicArgs<PluralOne> | DynamicArgs<PluralOther>
    : /** If a string segment follows the variable form parse its variable name and recursively
       * check for more dynamic args */
      LocalizedString extends `${string}{${infer Var}}${infer Rest}`
      ? Var | DynamicArgs<Rest>
      : never;

export type ArgsRecordExcludingDefaults<T extends LocalizerToken> = Omit<
  ArgsRecord<T>,
  keyof typeof LOCALE_DEFAULTS
>;

/** The arguments for retrieving a localized message */
export type GetMessageArgs<T extends LocalizerToken> = T extends LocalizerToken
  ? DynamicArgs<Dictionary[T]> extends never
    ? [T]
    : ArgsRecordExcludingDefaults<T> extends Record<string, never>
      ? [T]
      : [T, ArgsRecordExcludingDefaults<T>]
  : never;

/** Basic props for all calls of the I18n component */
type I18nBaseProps<T extends LocalizerToken> = {
  token: T;
  asTag?: ElementType;
  className?: string;
};

/** The props for the localization component */
export type I18nProps<T extends LocalizerToken> = T extends LocalizerToken
  ? DynamicArgs<Dictionary[T]> extends never
    ? I18nBaseProps<T>
    : ArgsRecordExcludingDefaults<T> extends Record<string, never>
      ? I18nBaseProps<T>
      : I18nBaseProps<T> & { args: ArgsRecordExcludingDefaults<T> }
  : never;

export type I18nMethods = {
  /** @see {@link window.i18n.stripped} */
  stripped: <T extends LocalizerToken, R extends LocalizerDictionary[T]>(
    ...[token, args]: GetMessageArgs<T>
  ) => R | T;
  /** @see {@link window.i18n.inEnglish} */
  inEnglish: <T extends LocalizerToken, R extends LocalizerDictionary[T]>(
    ...[token, args]: GetMessageArgs<T>
  ) => R | T;
  /** @see {@link window.i18n.formatMessageWithArgs */
  getRawMessage: <T extends LocalizerToken, R extends DictionaryWithoutPluralStrings[T]>(
    ...[token, args]: GetMessageArgs<T>
  ) => R | T;
  /** @see {@link window.i18n.formatMessageWithArgs} */
  formatMessageWithArgs: <T extends LocalizerToken, R extends DictionaryWithoutPluralStrings[T]>(
    rawMessage: R,
    args?: ArgsRecord<T>
  ) => R;
};

export type SetupI18nReturnType = I18nMethods &
  (<T extends LocalizerToken, R extends LocalizerDictionary[T]>(
    ...[token, args]: GetMessageArgs<T>
  ) => R);
