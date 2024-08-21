import styled from 'styled-components';

/**
 * @deprecated Use {@link StyledI18nSubText} instead.
 */
export const StyledSubText = styled('span')<{ textLength: number }>`
  font-size: var(--font-size-md);
  line-height: 1.5;
  margin-bottom: var(--margins-lg);

  max-width: ${props =>
    props.textLength > 90
      ? '60ch'
      : '33ch'}; // this is ugly, but we want the dialog description to have multiple lines when a short text is displayed
`;

/**
 * @deprecated Use {@link StyledI18nSubMessageText} instead.
 */
export const StyledSubMessageText = styled('span')`
  // Overrides SASS in this one case
  margin-top: 0;
  margin-bottom: var(--margins-md);
`;
