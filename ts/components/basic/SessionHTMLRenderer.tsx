import DOMPurify from 'dompurify';
import { createElement, type ElementType } from 'react';

type ReceivedProps = {
  html: string;
  tag?: ElementType;
  key?: any;
  className?: string;
};

export const SessionHtmlRenderer = ({ tag = 'div', key, html, className }: ReceivedProps) => {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_ATTR: ['script'],
  });

  return createElement(tag, {
    key,
    className,

    dangerouslySetInnerHTML: { __html: clean },
  });
};
