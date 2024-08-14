import type {
  GetMessageArgs,
  I18nProps,
  LocalizerDictionary,
  LocalizerToken,
} from '../../types/Localizer';

import { Fragment } from 'react';
import styled from 'styled-components';
import { useIsDarkTheme } from '../../state/selectors/theme';
import { SessionHtmlRenderer } from './SessionHTMLRenderer';
import {
  type CustomTag,
  CustomTagProps,
  SessionCustomTagRenderer,
  supportedCustomTags,
} from './SessionCustomTagRenderer';

/** An array of supported html tags to render if found in a string */
const supportedFormattingTags = ['b', 'i', 'u', 's', 'br', 'span'];

/** A regex to match supported formatting tags */
const formattingTagRegex = new RegExp(
  `<(?:${supportedFormattingTags.join('|')})>.*?</(?:${supportedFormattingTags.join('|')})>`,
  'g'
);

const customTagRegex = new RegExp(`<(${supportedCustomTags.join('|')})/>`, 'g');

const StyledHtmlRenderer = styled.span<{ isDarkTheme: boolean }>`
  span {
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
  const isDarkTheme = useIsDarkTheme();

  const i18nArgs = 'args' in props ? props.args : undefined;

  const i18nString = window.i18n<T, LocalizerDictionary[T]>(
    ...([props.token, i18nArgs] as GetMessageArgs<T>)
  );

  const containsFormattingTag = i18nString.match(formattingTagRegex);

  let startTag: CustomTag | null = null;
  let endTag: CustomTag | null = null;

  /**
   * @param match - The entire match, including the custom tag.
   * @param group - The custom tag, without the angle brackets.
   * @param index - The index of the match in the string.
   */
  i18nString.replace(customTagRegex, (match: string, group: CustomTag, index: number) => {
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
  });

  const content = containsFormattingTag ? (
    /** If the string contains a relevant formatting tag, render it as HTML */
    <StyledHtmlRenderer isDarkTheme={isDarkTheme}>
      <SessionHtmlRenderer tag={props.as} html={i18nString} />
    </StyledHtmlRenderer>
  ) : (
    i18nString
  );

  const Comp = props.as ?? Fragment;

  return (
    <Comp>
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
    </Comp>
  );
};
