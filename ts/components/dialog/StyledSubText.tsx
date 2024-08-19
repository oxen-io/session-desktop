import styled from 'styled-components';
import { SessionHtmlRenderer } from '../basic/SessionHTMLRenderer';

export const StyledSubText = styled(SessionHtmlRenderer)<{ textLength: number }>`
  font-size: var(--font-size-md);
  line-height: 1.5;
  margin-bottom: var(--margins-lg);

  max-width: ${props =>
    props.textLength > 90
      ? '60ch'
      : '33ch'}; // this is ugly, but we want the dialog description to have multiple lines when a short text is displayed
`;

export const StyledSubMessageText = styled(SessionHtmlRenderer)`
  // Overrides SASS in this one case
  margin-top: 0;
  margin-bottom: var(--margins-md);
`;
