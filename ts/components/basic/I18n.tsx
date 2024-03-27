import React from 'react';
import type {
  GetMessageArgs,
  I18nProps,
  LocalizerDictionary,
  LocalizerToken,
} from '../../types/Localizer';

import { SessionHtmlRenderer } from './SessionHTMLRenderer';

/** An array of supported html tags to render if found in a string */
const supportedFormattingTags = ['b', 'i', 'u', 's'];

/** A regex to match supported formatting tags */
const formattingTagRegex = new RegExp(
  `<(?:${supportedFormattingTags.join('|')})>.*?</(?:${supportedFormattingTags.join('|')})>`,
  'g'
);

/**
 * Retrieve a localized message string, substituting dynamic parts where necessary and formatting it as HTML if necessary.
 *
 * @param token - The token identifying the message to retrieve and an optional record of substitution variables and their replacement values.
 * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic parts.
 * @param as - An optional HTML tag to render the component as. Defaults to a fragment, unless the string contains html tags. In that case, it will render as HTML in a div tag.
 *
 * @returns The localized message string with substitutions and formatting applied.
 *
 * @example
 * ```tsx
 * <I18n token="about" />
 * <I18n token="about" as='h1' />
 * <I18n token="disappearingMessagesFollowSettingOn" args={{ time: 10, type: 'mode' }} />
 * ```
 */
export const I18n = <T extends LocalizerToken>(props: I18nProps<T>) => {
  const i18nArgs = 'args' in props ? props.args : undefined;

  const i18nString = window.i18n<T, LocalizerDictionary[T]>(
    ...([props.token, i18nArgs] as GetMessageArgs<T>)
  );

  /** If the string contains a relevant formatting tag, render it as HTML */
  if (i18nString.match(formattingTagRegex)) {
    return <SessionHtmlRenderer as={props.as} html={i18nString} />;
  }

  const Comp = props.as ?? React.Fragment;

  return <Comp>{i18nString}</Comp>;
};
