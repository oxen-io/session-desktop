import styled from 'styled-components';
import { forwardRef } from 'react';
import { I18n } from './I18n';
import { I18nProps, LocalizerToken } from '../../types/Localizer';

const StyledI18nSubTextContainer = styled('div')`
  font-size: var(--font-size-md);
  line-height: 1.5;
  margin-bottom: var(--margins-lg);

  // TODO: we'd like the description to be on two lines instead of one when it is short.
  // setting the max-width depending on the text length is **not** the way to go.
  // We should set the width on the dialog itself, depending on what we display.
  max-width: '60ch';
`;

const StyledI18nSubMessageTextContainer = styled('div')`
  // Overrides SASS in this one case
  margin-top: 0;
  margin-bottom: var(--margins-md);
`;

export const StyledI18nSubText = forwardRef<HTMLSpanElement, I18nProps<LocalizerToken>>(
  ({ className, ...props }) => {
    return (
      <StyledI18nSubTextContainer className={className}>
        <I18n {...props} />
      </StyledI18nSubTextContainer>
    );
  }
);

export const StyledI18nSubMessageText = forwardRef<HTMLSpanElement, I18nProps<LocalizerToken>>(
  ({ className, ...props }) => {
    return (
      <StyledI18nSubMessageTextContainer className={className}>
        <I18n {...props} />
      </StyledI18nSubMessageTextContainer>
    );
  }
);
