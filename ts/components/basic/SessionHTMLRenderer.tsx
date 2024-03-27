import DOMPurify from 'dompurify';
import React from 'react';

type ReceivedProps = {
  html: string;
  as?: React.ElementType;
  key?: any;
  className?: string;
};

export const SessionHtmlRenderer = ({ as = 'div', key, html, className }: ReceivedProps) => {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_ATTR: ['script'],
  });

  return React.createElement(as, {
    key,
    className,

    dangerouslySetInnerHTML: { __html: clean },
  });
};
