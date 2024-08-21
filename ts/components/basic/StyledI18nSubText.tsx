import styled from 'styled-components';
import { forwardRef } from 'react';
import { I18n } from './I18n';
import { I18nProps, LocalizerToken } from '../../types/Localizer';

const StyledI18nSubTextContainer = styled('div')<{ textLength: number }>`
  font-size: var(--font-size-md);
  line-height: 1.5;
  margin-bottom: var(--margins-lg);

  max-width: ${props =>
    props.textLength > 90
      ? '60ch'
      : '33ch'}; // this is ugly, but we want the dialog description to have multiple lines when a short text is displayed
`;

const StyledI18nSubMessageTextContainer = styled('div')`
  // Overrides SASS in this one case
  margin-top: 0;
  margin-bottom: var(--margins-md);
`;

export const StyledI18nSubText = forwardRef<
  HTMLSpanElement,
  I18nProps<LocalizerToken> & { textLength: number }
>(({ textLength = 90, className, ...props }) => {
  return (
    <StyledI18nSubTextContainer textLength={textLength} className={className}>
      <I18n {...props} />
    </StyledI18nSubTextContainer>
  );
});

export const StyledI18nSubMessageText = forwardRef<HTMLSpanElement, I18nProps<LocalizerToken>>(
  ({ className, ...props }) => {
    return (
      <StyledI18nSubMessageTextContainer className={className}>
        <I18n {...props} />
      </StyledI18nSubMessageTextContainer>
    );
  }
);
