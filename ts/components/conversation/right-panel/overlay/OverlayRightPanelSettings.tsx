import React from 'react';
// tslint:disable-next-line: no-submodule-imports
import { useDispatch, useSelector } from 'react-redux';
import {
  deleteAllMessagesByConvoIdWithConfirmation,
  showAddModeratorsByConvoId,
  showInviteContactByConvoId,
  showLeaveGroupByConvoId,
  showRemoveModeratorsByConvoId,
  showUpdateGroupMembersByConvoId,
  showUpdateGroupNameByConvoId,
} from '../../../../interactions/conversationInteractions';
import { getSelectedConversation } from '../../../../state/selectors/conversations';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../../../basic/SessionButton';
import { SpacerLG } from '../../../basic/Text';
import styled from 'styled-components';
import { SessionIconButton } from '../../../icon';
import { Avatar, AvatarSize } from '../../../avatar/Avatar';
import { resetRightOverlayMode, setRightOverlayMode } from '../../../../state/ducks/section';
import { PanelButtonGroup, PanelIconButton } from '../../../buttons';

const HeaderItem = () => {
  const selectedConversation = useSelector(getSelectedConversation);
  const dispatch = useDispatch();

  if (!selectedConversation) {
    return null;
  }
  const { id, isGroup, isKickedFromGroup, isBlocked, left } = selectedConversation;

  const showInviteContacts = isGroup && !isKickedFromGroup && !isBlocked && !left;

  return (
    <div className="right-panel-header">
      <SessionIconButton
        iconType="chevron"
        iconSize="medium"
        iconRotation={270}
        onClick={() => {
          dispatch(resetRightOverlayMode());
        }}
        style={{ position: 'absolute' }}
        dataTestId="back-button-conversation-options"
      />
      <Avatar size={AvatarSize.XL} pubkey={id} />
      {showInviteContacts && (
        <SessionIconButton
          iconType="addUser"
          iconSize="medium"
          onClick={() => {
            if (selectedConversation) {
              showInviteContactByConvoId(selectedConversation.id);
            }
          }}
          dataTestId="add-user-button"
        />
      )}
    </div>
  );
};

const StyledLeaveButton = styled.div`
  width: 100%;
  .session-button {
    margin-top: auto;
    width: 100%;
    min-height: calc(var(--composition-container-height) + 1px); // include border in height
    flex-shrink: 0;
    align-items: center;
    border-top: 1px solid var(--border-color);
    border-radius: 0px;

    &:not(.disabled) {
      &:hover {
        background-color: var(--button-solid-background-hover-color);
      }
    }
  }
`;

const StyledGroupSettingsItem = styled.div`
  display: flex;
  align-items: center;
  min-height: 3rem;
  font-size: var(--font-size-md);
  color: var(--right-panel-item-text-color);
  background-color: var(--right-panel-item-background-color);
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);

  width: -webkit-fill-available;
  padding: 0 var(--margins-md);
  transition: var(--default-duration);
  cursor: pointer;

  &:hover {
    background-color: var(--right-panel-item-background-hover-color);
  }
`;

// tslint:disable: cyclomatic-complexity
// tslint:disable: max-func-body-length
export const OverlayRightPanelSettings = () => {
  const selectedConversation = useSelector(getSelectedConversation);
  const dispatch = useDispatch();

  if (!selectedConversation) {
    return null;
  }

  const {
    id,
    subscriberCount,
    displayNameInProfile,
    isKickedFromGroup,
    left,
    isPublic,
    weAreAdmin,
    isBlocked,
    isGroup,
    activeAt,
  } = selectedConversation;
  const showMemberCount = !!(subscriberCount && subscriberCount > 0);
  const commonNoShow = isKickedFromGroup || left || isBlocked || !activeAt;
  const hasDisappearingMessagesAvailable = !isPublic && !commonNoShow;
  const leaveGroupString = isPublic
    ? window.i18n('leaveGroup')
    : isKickedFromGroup
    ? window.i18n('youGotKickedFromGroup')
    : left
    ? window.i18n('youLeftTheGroup')
    : window.i18n('leaveGroup');

  const showUpdateGroupNameButton =
    isGroup && (!isPublic || (isPublic && weAreAdmin)) && !commonNoShow;
  const showAddRemoveModeratorsButton = weAreAdmin && !commonNoShow && isPublic;
  const showUpdateGroupMembersButton = !isPublic && isGroup && !commonNoShow;

  const deleteConvoAction = isPublic
    ? () => {
        deleteAllMessagesByConvoIdWithConfirmation(id);
      }
    : () => {
        showLeaveGroupByConvoId(id);
      };

  return (
    <>
      <HeaderItem />
      <h2 data-testid="right-panel-group-name">{displayNameInProfile}</h2>
      {showMemberCount && (
        <>
          <SpacerLG />
          <div role="button" className="subtle">
            {window.i18n('members', [`${subscriberCount}`])}
          </div>
          <SpacerLG />
        </>
      )}
      {showUpdateGroupNameButton && (
        <StyledGroupSettingsItem
          className="right-panel-item"
          role="button"
          onClick={async () => {
            await showUpdateGroupNameByConvoId(id);
          }}
        >
          {isPublic ? window.i18n('editGroup') : window.i18n('editGroupName')}
        </StyledGroupSettingsItem>
      )}
      {showAddRemoveModeratorsButton && (
        <>
          <StyledGroupSettingsItem
            className="right-panel-item"
            role="button"
            onClick={() => {
              showAddModeratorsByConvoId(id);
            }}
          >
            {window.i18n('addModerators')}
          </StyledGroupSettingsItem>
          <StyledGroupSettingsItem
            className="right-panel-item"
            role="button"
            onClick={() => {
              showRemoveModeratorsByConvoId(id);
            }}
          >
            {window.i18n('removeModerators')}
          </StyledGroupSettingsItem>
        </>
      )}

      <PanelButtonGroup>
        {hasDisappearingMessagesAvailable && (
          <PanelIconButton
            iconType={'timer50'}
            text={window.i18n('disappearingMessages')}
            disableBg={true}
            onClick={() => {
              dispatch(setRightOverlayMode({ type: 'disappearing_messages', params: null }));
            }}
          />
        )}
        <PanelIconButton
          iconType={'file'}
          text={window.i18n('allMedia')}
          disableBg={true}
          onClick={() => {
            dispatch(setRightOverlayMode({ type: 'show_media', params: null }));
          }}
        />
        {showUpdateGroupMembersButton && (
          <PanelIconButton
            iconType={'group'}
            text={window.i18n('groupMembers')}
            disableBg={true}
            onClick={async () => {
              await showUpdateGroupMembersByConvoId(id);
            }}
          />
        )}
      </PanelButtonGroup>

      {isGroup && (
        // tslint:disable-next-line: use-simple-attributes
        <StyledLeaveButton>
          <SessionButton
            text={leaveGroupString}
            buttonColor={SessionButtonColor.Danger}
            buttonType={SessionButtonType.Simple}
            disabled={isKickedFromGroup || left}
            onClick={deleteConvoAction}
          />
        </StyledLeaveButton>
      )}
    </>
  );
};
