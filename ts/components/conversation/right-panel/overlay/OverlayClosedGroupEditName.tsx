import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { setRightOverlayMode } from '../../../../state/ducks/section';

import { useRightOverlayMode } from '../../../../state/selectors/section';
import {
  useSelectedDescription,
  useSelectedDisplayNameInProfile,
  useSelectedIsClosedGroup,
  useSelectedIsKickedFromGroup,
  useSelectedIsLeft,
  useSelectedWeAreAdmin,
} from '../../../../state/selectors/selectedConversation';

import { Flex } from '../../../basic/Flex';
import { SessionButton, SessionButtonColor } from '../../../basic/SessionButton';
import { SpacerLG, SpacerSM } from '../../../basic/Text';

import { StyledScrollContainer } from '../RightPanel';
import { RightOverlayHeader } from './RightOverlayHeader';

const NewGroupNameInput = styled.input`
  width: 100%;
  border-color: var(--input-border-color);
  outline: none;
`;

const DescriptionText = styled.textarea`
  width: 100%;
  border-color: var(--input-border-color);
  outline: none;
`;

const Label = styled.label`
  align-self: flex-start;
`;

export const OverlayClosedGroupEditName = () => {
  const dispatch = useDispatch();
  const rightOverlay = useRightOverlayMode();
  const currentGroupName = useSelectedDisplayNameInProfile();
  const description = useSelectedDescription();

  const weAreAdmin = useSelectedWeAreAdmin();
  const kicked = useSelectedIsKickedFromGroup();
  const left = useSelectedIsLeft();
  const isClosedGroup = useSelectedIsClosedGroup();

  useEffect(() => {
    if (!isClosedGroup || !weAreAdmin || left || kicked) {
      dispatch(setRightOverlayMode({ type: 'default', params: null }));
    }
  }, [isClosedGroup, weAreAdmin || left || kicked]);

  if (!rightOverlay || rightOverlay.type !== 'closed_group_edit_name') {
    return null;
  }

  if (!weAreAdmin || left || kicked) {
    throw new Error('OverlayClosedGroupEditName should not be shown');
  }

  return (
    <StyledScrollContainer>
      <Flex container={true} flexDirection={'column'} alignItems={'center'} width="100%">
        <RightOverlayHeader title={window.i18n('nameAndDescription')} hideBackButton={false} />
        <SpacerLG />
        <Label>{window.i18n('newGroupNameLabel')}</Label>
        <NewGroupNameInput placeholder={currentGroupName} />
        <SpacerLG />
        <Label>{window.i18n('newDescriptionLabel')}</Label>
        <DescriptionText placeholder={description} rows={3} />
        <SpacerSM />
        <Flex container={true} justifyContent="space-evenly" width="100%">
          <SessionButton
            text={window.i18n('removeDescription')}
            buttonColor={SessionButtonColor.Danger}
          />

          <SessionButton text={window.i18n('applyChanges')} />
        </Flex>
      </Flex>
    </StyledScrollContainer>
  );
};
