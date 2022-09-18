import React from 'react';
import styled from 'styled-components';

type Props = {
  count?: number;
};

const StyledCountContainer = styled.div<{ shouldRender: boolean }>`
  position: absolute;
  width: 20px;
  height: 20px;
  font-size: 20px;
  top: var(--margins-lg);
  left: var(--margins-sm);
  padding: 3px;
  opacity: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-default);
  border-radius: 50%;
  font-weight: 700;
  background: var(--color-accent);
  transition: var(--default-duration);
  opacity: ${props => (props.shouldRender ? 1 : 0)};
  text-align: center;
  color: var(--color-text-opposite);
  /* cursor:  */
`;

const StyledCount = styled.div<{ countOverflow: boolean }>`
  position: relative;
  font-size: ${props => (props.countOverflow ? '0.5em' : '0.6em')};
  margin-top: 0em;
  margin-left: 0em;
`;

const StyledCountSup = styled.div`
  position: absolute;
  font-size: 0.75em;
  top: -0.15em;
  margin-inline-start: 1.4em;
`;

export const SessionNotificationCount = (props: Props) => {
  const { count } = props;
  const overflow = Boolean(count && count > 99);
  const shouldRender = Boolean(count && count > 0);

  if (overflow) {
    return (
      <StyledCountContainer shouldRender={shouldRender}>
        <StyledCount countOverflow={overflow}>
          {99}
          <StyledCountSup>+</StyledCountSup>
        </StyledCount>
      </StyledCountContainer>
    );
  }
  const shrink = Boolean(count && count > 9);
  return (
    <StyledCountContainer shouldRender={shouldRender}>
      <StyledCount countOverflow={shrink}>{count}</StyledCount>
    </StyledCountContainer>
  );
};
