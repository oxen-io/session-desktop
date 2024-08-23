/** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.inEnglish } and {@link window.i18n.inEnglish } */

import { en } from '../../../localization/locales';
import {
  LocalizerToken,
  LocalizerDictionary,
  GetMessageArgs,
  ArgsRecord,
} from '../../../types/Localizer';
import { i18nLog } from '../shared';
import { formatMessageWithArgs } from './formatMessageWithArgs';

/**
 * Retrieves a message string in the {@link en} locale, substituting variables where necessary.
 *
 * NOTE: This does not work for plural strings. This function should only be used for debug and
 * non-user-facing strings. Plural string support can be added splitting out the logic for
 * {@link setupI18n.formatMessageWithArgs} and creating a new getMessageFromDictionary, which
 * specifies takes a dictionary as an argument. This is left as an exercise for the reader.
 *
 * @param token - The token identifying the message to retrieve.
 * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
 */
export function inEnglish<T extends LocalizerToken, R extends LocalizerDictionary[T]>(
  ...[token, args]: GetMessageArgs<T>
): R | T {
  const rawMessage = en[token] as R;
  if (!rawMessage) {
    i18nLog(
      `Attempted to get forced en string for nonexistent key: '${token}' in fallback dictionary`
    );
    return token as T;
  }
  return formatMessageWithArgs<T, R>(rawMessage, args as ArgsRecord<T>);
}
