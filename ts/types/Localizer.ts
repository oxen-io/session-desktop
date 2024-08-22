/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ElementType } from 'react';
import type { Dictionary } from '../localization/locales';
import { CustomTag, CustomTagProps } from '../components/basic/SessionCustomTagRenderer';
import { LOCALE_DEFAULTS } from '../localization/constants';

/** A localization dictionary key */
type Token = keyof Dictionary;

/** A dynamic argument that can be used in a localized string */
export type DynamicArg = string | number;

/** A record of dynamic arguments for a specific key in the localization dictionary */
export type ArgsRecord<T extends Token> = Record<DynamicArgs<Dictionary[T]>, DynamicArg>;

export type PluralKey = 'count';

export type PluralString = `{${string}, plural, one [${string}] other [${string}]}`;

// TODO: create a proper type for this
export type DictionaryWithoutPluralStrings = Dictionary;

/** The dynamic arguments in a localized string */
type DynamicArgs<LocalizedString extends string> =
  /** If a string follows the plural format use its plural variable name and recursively check for
   *  dynamic args inside all plural forms */
  LocalizedString extends `{${infer PluralVar}, plural, one [${infer PluralOne}] other [${infer PluralOther}]}`
    ? PluralVar | DynamicArgs<PluralOne> | DynamicArgs<PluralOther>
    : /** If a string segment follows the variable form parse its variable name and recursively
       * check for more dynamic args */
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- We dont care about _Pre TODO: see if we can remove this infer
      LocalizedString extends `${string}{${infer Var}}${infer Rest}`
      ? Var | DynamicArgs<Rest>
      : never;

export type ArgsRecordExcludingDefaults<T extends Token> = Omit<
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
type I18nBaseProps<T extends Token> = {
  token: T;
  asTag?: ElementType;
  className?: string;
  // TODO: investigate making these required when required and not required when not required
  startTagProps?: CustomStartTagProps<T>;
  endTagProps?: CustomEndTagProps<T>;
};

/** The props for the localization component */
export type I18nProps<T extends Token> = T extends Token
  ? DynamicArgs<Dictionary[T]> extends never
    ? I18nBaseProps<T>
    : ArgsRecordExcludingDefaults<T> extends Record<string, never>
      ? I18nBaseProps<T>
      : I18nBaseProps<T> & { args: ArgsRecordExcludingDefaults<T> }
  : never;

/** The props for custom tags at the start of an i18n strings */
export type CustomStartTagProps<T extends Token> = T extends Token
  ? Dictionary[T] extends `<${infer Tag}/>${string}`
    ? Tag extends CustomTag
      ? CustomTagProps<Tag>
      : never
    : never
  : never;

/**
 * This is used to find the end tag. TypeScript navigates from outwards to inwards when doing magic
 * with strings. This means we need a recursive type to find the actual end tag.
 *
 * @example For the string `{name} reacted with <emoji/>`
 * The first iteration will find `Tag` as `emoji` because it grabs the first `<` and the last `/>`
 * Because it doesn't contain a `<` it will return the Tag.
 *
 * @example For the string `You, {name} & <span>1 other</span> reacted with <emoji/>`
 * The first iteration will find `Tag` as `span>1 other</span> reacted with <emoji` because it
 * grabs the first `<` and the last `/>, so we then check if Tag contains a `<`:
 * - If it doesn't then we have found it;
 * - If it does then we need to run it through the same process again to search deeper.
 */
type CustomEndTag<LocalizedString extends string> =
  LocalizedString extends `${string}<${infer Tag}/>${string}` ? FindCustomTag<Tag> : never;

type FindCustomTag<S extends string> = S extends CustomTag
  ? S
  : S extends `${string}<${infer Tag}`
    ? Tag extends CustomTag
      ? Tag
      : FindCustomTag<Tag>
    : never;

/** The props for custom tags at the end of an i18n strings */
type CustomEndTagProps<T extends Token> =
  CustomEndTag<Dictionary[T]> extends CustomTag
    ? CustomTagProps<CustomEndTag<Dictionary[T]>>
    : never;

/** The dictionary of localized strings */
export type LocalizerDictionary = Dictionary;

/** A localization dictionary key */
export type LocalizerToken = Token;

export type I18nMethods = {
  /** @see {@link window.i18n.stripped} */
  stripped: <T extends LocalizerToken, R extends LocalizerDictionary[T]>(
    ...[token, args]: GetMessageArgs<T>
  ) => R;
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
