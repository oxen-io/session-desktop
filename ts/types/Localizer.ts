import type { Dictionary } from '../localization/locales';

/** A localization dictionary key */
type Token = keyof Dictionary;

/** A dynamic argument that can be used in a localized string */
type DynamicArg = string | number;

/** A record of dynamic arguments for a specific key in the localization dictionary */
type ArgsRecord<T extends Token> = Record<DynamicArgs<Dictionary[T]>, DynamicArg>;

/** The dynamic arguments in a localized string */
type DynamicArgs<LocalizedString extends string> =
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  LocalizedString extends `${infer _Pre}{${infer Var}}${infer Rest}`
    ? Var | DynamicArgs<Rest>
    : never;

/** The arguments for retrieving a localized message */
export type GetMessageArgs<T extends Token> =
  DynamicArgs<Dictionary[T]> extends never ? [T] : [T, ArgsRecord<T>];

/** The props for the localization component */
export type I18nProps<T extends Token> =
  DynamicArgs<Dictionary[T]> extends never ? { token: T } : { token: T; args: ArgsRecord<T> };

/** The dictionary of localized strings */
export type LocalizerDictionary = Dictionary;

/** A localization dictionary key */
export type LocalizerToken = keyof LocalizerDictionary;
