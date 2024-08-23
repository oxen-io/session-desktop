/** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.stripped } and {@link window.i18n.stripped } */

import { deSanitizeHtmlTags, sanitizeArgs } from '../../../components/basic/I18n';
import { GetMessageArgs, LocalizerDictionary, LocalizerToken } from '../../../types/Localizer';
import { getMessage } from './getMessage';

/**
 * Retrieves a localized message string, substituting variables where necessary. Then strips the message of any HTML and custom tags.
 *
 * @param token - The token identifying the message to retrieve.
 * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
 *
 * @returns The localized message string with substitutions applied. Any HTML and custom tags are removed.
 *
 * @example
 * // The string greeting is 'Hello, {name}! <b>Welcome!</b>' in the current locale
 * window.i18n.stripped('greeting', { name: 'Alice' });
 * // => 'Hello, Alice! Welcome!'
 */
export function stripped<T extends LocalizerToken, R extends LocalizerDictionary[T]>(
  ...[token, args]: GetMessageArgs<T>
): R | T {
  const sanitizedArgs = args ? sanitizeArgs(args, '\u200B') : undefined;

  const i18nString = getMessage<T, LocalizerDictionary[T]>(
    ...([token, sanitizedArgs] as GetMessageArgs<T>)
  );

  const strippedString = i18nString.replaceAll(/<[^>]*>/g, '');

  return deSanitizeHtmlTags(strippedString, '\u200B') as R;
}
