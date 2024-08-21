import styled from 'styled-components';
import { Fragment } from 'react';
import type {
  GetMessageArgs,
  I18nProps,
  LocalizerDictionary,
  LocalizerToken,
} from '../../types/Localizer';

import { useIsDarkTheme } from '../../state/selectors/theme';
import { SessionHtmlRenderer } from './SessionHTMLRenderer';
import {
  type CustomTag,
  CustomTagProps,
  SessionCustomTagRenderer,
  supportedCustomTags,
} from './SessionCustomTagRenderer';

/** An array of supported html tags to render if found in a string */
export const supportedFormattingTags = ['b', 'i', 'u', 's', 'br', 'span'];
/** NOTE: self-closing tags must also be listed in {@link supportedFormattingTags} */
const supportedSelfClosingFormattingTags = ['br'];

function createSupportedFormattingTagsRegex() {
  return new RegExp(
    `<(?:${supportedFormattingTags.join('|')})>.*?</(?:${supportedFormattingTags.join('|')})>|<(?:${supportedSelfClosingFormattingTags.join('|')})\\/>`,
    'g'
  );
}

function createSupportedCustomTagsRegex() {
  return new RegExp(`<(${supportedCustomTags.join('|')})/>`, 'g');
}

/**
 * Replaces all html tag identifiers with their escaped equivalents
 * @param str The string to sanitize
 * @param identifier The identifier to use for the args. Use this if you want to de-sanitize the args later.
 * @returns The sanitized string
 */
export function sanitizeHtmlTags(str: string, identifier: string = ''): string {
  if (identifier && /[a-zA-Z0-9></\\\-\s]+/g.test(identifier)) {
    throw new Error('Identifier is not valid');
  }

  return str
    .replace(/&/g, `${identifier}&amp;${identifier}`)
    .replace(/</g, `${identifier}&lt;${identifier}`)
    .replace(/>/g, `${identifier}&gt;${identifier}`);
}

/**
 * Replaces all sanitized html tags with their real equivalents
 * @param str The string to de-sanitize
 * @param identifier The identifier used when the args were sanitized
 * @returns The de-sanitized string
 */
export function deSanitizeHtmlTags(str: string, identifier: string): string {
  if (!identifier || /[a-zA-Z0-9></\\\-\s]+/g.test(identifier)) {
    throw new Error('Identifier is not valid');
  }

  return str
    .replace(new RegExp(`${identifier}&amp;${identifier}`, 'g'), '&')
    .replace(new RegExp(`${identifier}&lt;${identifier}`, 'g'), '<')
    .replace(new RegExp(`${identifier}&gt;${identifier}`, 'g'), '>');
}

/**
 * Sanitizes the args to be used in the i18n function
 * @param args The args to sanitize
 * @param identifier The identifier to use for the args. Use this if you want to de-sanitize the args later.
 * @returns The sanitized args
 */
export function sanitizeArgs(
  args: Record<string, string | number>,
  identifier?: string
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(args).map(([key, value]) => [
      key,
      typeof value === 'string' ? sanitizeHtmlTags(value, identifier) : value,
    ])
  );
}

const StyledHtmlRenderer = styled.span<{ isDarkTheme: boolean }>`
  * > span {
    color: ${props => (props.isDarkTheme ? 'var(--primary-color)' : 'var(--text-primary-color)')};
  }
`;

/**
 * Retrieve a localized message string, substituting dynamic parts where necessary and formatting it as HTML if necessary.
 *
 * @param props.token - The token identifying the message to retrieve and an optional record of substitution variables and their replacement values.
 * @param props.args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic parts.
 * @param props.as - An optional HTML tag to render the component as. Defaults to a fragment, unless the string contains html tags. In that case, it will render as HTML in a div tag.
 * @param props.startTagProps - An optional object of props to pass to the start tag.
 * @param props.endTagProps - An optional object of props to pass to the end tag.
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
  const isDarkMode = useIsDarkTheme();
  const containsFormattingTags = createSupportedFormattingTagsRegex().test(props.token);

  const args = 'args' in props ? props.args : undefined;
  const i18nArgs = args && containsFormattingTags ? sanitizeArgs(args) : args;

  let i18nString: string = window.i18n<T, LocalizerDictionary[T]>(
    ...([props.token, i18nArgs] as GetMessageArgs<T>)
  );

  let startTag: CustomTag | null = null;
  let endTag: CustomTag | null = null;

  /**
   * @param match - The entire match, including the custom tag.
   * @param group - The custom tag, without the angle brackets.
   * @param index - The index of the match in the string.
   */
  i18nString = i18nString.replace(
    createSupportedCustomTagsRegex(),
    (match: string, group: CustomTag, index: number) => {
      if (index === 0) {
        startTag = group;
      } else if (index === i18nString.length - match.length) {
        endTag = group;
      } else {
        /**
         * If the match is not at the start or end of the string, throw an error.
         * NOTE: This should never happen as this rule is enforced when the dictionary is generated.
         */
        throw new Error(
          `Custom tag ${group} (${match}) is not at the start or end (i=${index}) of the string: ${i18nString}`
        );
      }

      return '';
    }
  );

  const content = createSupportedFormattingTagsRegex().test(i18nString) ? (
    /** If the string contains a relevant formatting tag, render it as HTML */
    <StyledHtmlRenderer isDarkTheme={isDarkMode}>
      <SessionHtmlRenderer tag={props.asTag} html={i18nString} className={props.className} />
    </StyledHtmlRenderer>
  ) : (
    i18nString
  );

  return (
    <Fragment>
      {startTag ? (
        <SessionCustomTagRenderer
          tag={startTag}
          tagProps={props.startTagProps as CustomTagProps<typeof startTag>}
        />
      ) : null}
      {content}
      {endTag ? (
        <SessionCustomTagRenderer
          tag={endTag}
          tagProps={props.endTagProps as CustomTagProps<typeof endTag>}
        />
      ) : null}
    </Fragment>
  );
};
