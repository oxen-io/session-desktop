/** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.getMessage } and {@link window.i18n } */

import {
  LocalizerToken,
  LocalizerDictionary,
  GetMessageArgs,
  ArgsRecord,
  DictionaryWithoutPluralStrings,
} from '../../../types/Localizer';
import { i18nLog } from '../shared';
import { formatMessageWithArgs } from './formatMessageWithArgs';
import { getRawMessage } from './getRawMessage';

/**
 * Checks if a string contains a dynamic variable.
 * @param localizedString - The string to check.
 * @returns `true` if the string contains a dynamic variable, otherwise `false`.
 *
 * TODO: Change this to a proper type assertion when the type is fixed.
 */
const isStringWithArgs = <R extends DictionaryWithoutPluralStrings[LocalizerToken]>(
  localizedString: string
): localizedString is R => localizedString.includes('{');

/**
 * Retrieves a localized message string, substituting variables where necessary.
 *
 * @param token - The token identifying the message to retrieve.
 * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
 *
 * @returns The localized message string with substitutions applied.
 *
 * @example
 * // The string greeting is 'Hello, {name}!' in the current locale
 * window.i18n('greeting', { name: 'Alice' });
 * // => 'Hello, Alice!'
 *
 * // The string search is '{count, plural, one [{found_count} of # match] other [{found_count} of # matches]}' in the current locale
 * window.i18n('search', { count: 1, found_count: 1 });
 * // => '1 of 1 match'
 */
export function getMessage<T extends LocalizerToken, R extends LocalizerDictionary[T]>(
  ...[token, args]: GetMessageArgs<T>
): R | T {
  try {
    const rawMessage = getRawMessage<T, R>(...([token, args] as GetMessageArgs<T>));

    /** If a localized string does not have any arguments to substitute it is returned with no changes. */
    if (!isStringWithArgs<R>(rawMessage)) {
      return rawMessage;
    }

    return formatMessageWithArgs<T, R>(rawMessage, args as ArgsRecord<T>);
  } catch (error) {
    i18nLog(error.message);
    return token as R;
  }
}
