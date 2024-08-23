/** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.formatMessageWithArgs } and {@link window.i18n.formatMessageWithArgs } */

import { LOCALE_DEFAULTS } from '../../../localization/constants';
import {
  ArgsRecord,
  DictionaryWithoutPluralStrings,
  LocalizerToken,
} from '../../../types/Localizer';

/**
 * Formats a localized message string with arguments and returns the formatted string.
 * @param rawMessage - The raw message string to format. After using @see {@link getRawMessage} to get the raw string.
 * @param args - An optional record of substitution variables and their replacement values. This
 * is required if the string has dynamic variables. This can be optional as a strings args may be defined in @see {@link LOCALE_DEFAULTS}
 *
 * @returns The formatted message string.
 *
 * @example
 * // The string greeting is 'Hello, {name}!' in the current locale
 * window.i18n.getRawMessage('greeting', { name: 'Alice' });
 * // => 'Hello, {name}!'
 * window.i18n.formatMessageWithArgs('greeting', { name: 'Alice' });
 * // => 'Hello, Alice!'
 *
 * // The string search is '{count, plural, one [{found_count} of # match] other [{found_count} of # matches]}' in the current locale
 * window.i18n.getRawMessage('search', { count: 1, found_count: 1 });
 * // => '{found_count} of {count} match'
 * window.i18n.formatMessageWithArgs('search', { count: 1, found_count: 1 });
 * // => '1 of 1 match'
 */
export function formatMessageWithArgs<
  T extends LocalizerToken,
  R extends DictionaryWithoutPluralStrings[T],
>(rawMessage: R, args?: ArgsRecord<T>): R {
  /** Find and replace the dynamic variables in a localized string and substitute the variables with the provided values */
  // TODO: remove the type casting once we have a proper DictionaryWithoutPluralStrings type
  return (rawMessage as `${string}{${string}}${string}`).replace(
    /\{(\w+)\}/g,
    (match, arg: string) => {
      const matchedArg = args ? args[arg as keyof typeof args] : undefined;

      return (
        matchedArg?.toString() ?? LOCALE_DEFAULTS[arg as keyof typeof LOCALE_DEFAULTS] ?? match
      );
    }
  ) as R;
}
