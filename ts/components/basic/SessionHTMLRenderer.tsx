import DOMPurify from 'dompurify';
import { createElement, type ElementType } from 'react';
import { supportedFormattingTags } from './I18n';

type ReceivedProps = {
  html: string;
  tag?: ElementType;
  key?: any;
  className?: string;
};

/**
 * Renders HTML as a string, sanitizing it first.
 *
 * @param props - The props to use for rendering.
 * @param props.html - The HTML to render.
 * @param props.tag - The tag to render the HTML as. Defaults to a div.
 * @param props.key - The key to use for the rendered element.
 * @param props.className - The className to use for the rendered element.
 *
 * For a list of supported tags, see {@link supportedFormattingTags}.
 *
 * @returns The rendered HTML as a string.
 */
export const SessionHtmlRenderer = ({ tag = 'div', key, html, className }: ReceivedProps) => {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: supportedFormattingTags,
  });

  return createElement(tag, {
    key,
    className,
    dangerouslySetInnerHTML: { __html: clean },
  });
};
