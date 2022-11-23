import { isEmpty } from 'lodash';
import React from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { resetRightOverlayMode, setRightOverlayMode } from '../../../../state/ducks/section';
import { useRightOverlayMode } from '../../../../state/selectors/section';
import { Flex } from '../../../basic/Flex';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../../../basic/SessionButton';
import { SessionIconButton } from '../../../icon';

const StyledTitle = styled.h2`
  font-family: var(--font-default);
  text-align: center;
  margin-top: 0px;
  margin-bottom: 0px;
`;

const StyledSubTitle = styled.h3`
  font-family: var(--font-default);
  font-size: 11px;
  font-weight: 400;
  text-align: center;
  padding-top: 0px;
  margin-top: 0;
`;

type HeaderProps = {
  title: string;
  subtitle?: string;
  hideBackButton: boolean;
  rightButtonText?: string;
  onButtonClicked?: () => void;
};

const StyledHeader = styled.div`
  display: flex;
  width: 100%;
  padding: 32px var(--margins-lg) var(--margins-md);
  align-items: baseline;
`;

const HeaderBackButton = () => {
  const dispatch = useDispatch();

  const rightOverlayMode = useRightOverlayMode();

  return (
    <SessionIconButton
      iconSize={'medium'}
      iconType={'chevron'}
      iconRotation={90}
      onClick={() => {
        if (
          rightOverlayMode &&
          (rightOverlayMode.type === 'closed_group_edit_name' ||
            rightOverlayMode.type === 'closed_group_invite')
        ) {
          dispatch(setRightOverlayMode({ type: 'closed_group_edit', params: null }));
        } else {
          dispatch(setRightOverlayMode({ type: 'default', params: null }));
        }
      }}
    />
  );
};

export const RightOverlayHeader = (props: HeaderProps) => {
  const { title, subtitle, hideBackButton, rightButtonText, onButtonClicked } = props;
  const hasSubtitle = !isEmpty(subtitle);
  const dispatch = useDispatch();
  const hasButtonText = !!rightButtonText && !!onButtonClicked;

  return (
    <StyledHeader>
      {!hideBackButton && <HeaderBackButton />}
      <Flex
        container={true}
        flexDirection={'column'}
        justifyContent={'flex-start'}
        alignItems={'center'}
        width={'100%'}
        margin={'-5px auto auto'}
      >
        <StyledTitle>{title}</StyledTitle>
        {hasSubtitle && <StyledSubTitle>{subtitle}</StyledSubTitle>}
      </Flex>
      {!hasButtonText ? (
        <SessionIconButton
          iconSize={'tiny'}
          iconType={'exit'}
          onClick={() => {
            dispatch(resetRightOverlayMode());
          }}
        />
      ) : (
        <SessionButton
          buttonType={SessionButtonType.Simple}
          buttonColor={SessionButtonColor.Danger}
          text={rightButtonText}
          onClick={onButtonClicked}
        />
      )}
    </StyledHeader>
  );
};
