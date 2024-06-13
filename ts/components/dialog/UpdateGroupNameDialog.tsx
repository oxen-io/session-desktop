/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useState } from 'react';

import { useDispatch } from 'react-redux';
import useKey from 'react-use/lib/useKey';
import styled from 'styled-components';
import { useIsClosedGroup, useIsPublic } from '../../hooks/useParamSelector';
import { ConvoHub } from '../../session/conversations';
import { ClosedGroup } from '../../session/group/closed-group';
import { initiateOpenGroupUpdate } from '../../session/group/open-group';
import { PubKey } from '../../session/types';
import { groupInfoActions } from '../../state/ducks/metaGroups';
import { updateGroupNameModal } from '../../state/ducks/modalDialog';
import { useGroupNameChangeFromUIPending } from '../../state/selectors/groups';
import { pickFileForAvatar } from '../../types/attachments/VisualAttachment';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { Avatar, AvatarSize } from '../avatar/Avatar';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { SessionSpinner } from '../basic/SessionSpinner';
import { SpacerMD } from '../basic/Text';
import { Constants } from '../../session';

function GroupAvatar({
  isPublic,
  conversationId,
  fireInputEvent,
  newAvatarObjecturl,
  oldAvatarPath,
}: {
  isPublic: boolean;
  conversationId: string;
  newAvatarObjecturl: string | null;
  oldAvatarPath: string | null;
  fireInputEvent: () => Promise<void>;
}) {
  if (!isPublic) {
    return null;
  }

  return (
    <div className="avatar-center">
      <div className="avatar-center-inner">
        <Avatar
          forcedAvatarPath={newAvatarObjecturl || oldAvatarPath}
          size={AvatarSize.XL}
          pubkey={conversationId}
        />
        <div className="image-upload-section" role="button" onClick={fireInputEvent} />
      </div>
    </div>
  );
}

const StyledError = styled.p`
  text-align: center;
  color: var(--danger-color);
  display: block;
  user-select: none;
`;

export function UpdateGroupNameDialog(props: { conversationId: string }) {
  const dispatch = useDispatch();
  const { conversationId } = props;
  const [errorMsg, setErrorMsg] = useState('');
  const [newAvatarObjecturl, setNewAvatarObjecturl] = useState<string | null>(null);
  const isCommunity = useIsPublic(conversationId);
  const isClosedGroup = useIsClosedGroup(conversationId);
  const convo = ConvoHub.use().get(conversationId);
  const isNameChangePending = useGroupNameChangeFromUIPending();

  if (!convo) {
    throw new Error('UpdateGroupNameDialog corresponding convo not found');
  }

  const oldAvatarPath = convo?.getAvatarPath() || null;
  const originalGroupName = convo?.getRealSessionUsername();
  const [newGroupName, setNewGroupName] = useState(originalGroupName);

  function closeDialog() {
    dispatch(updateGroupNameModal(null));
  }

  function onShowError(msg: string) {
    if (errorMsg === msg) {
      return;
    }
    setErrorMsg(msg);
  }

  async function fireInputEvent() {
    const scaledObjectUrl = await pickFileForAvatar();
    if (scaledObjectUrl) {
      setNewAvatarObjecturl(scaledObjectUrl);
    }
  }

  function onClickOK() {
    if (isNameChangePending) {
      return;
    }
    const trimmedGroupName = newGroupName?.trim();
    if (!trimmedGroupName) {
      onShowError(window.i18n('emptyGroupNameError'));

      return;
    }
    if (trimmedGroupName.length > Constants.VALIDATION.MAX_GROUP_NAME_LENGTH) {
      onShowError(window.i18n('invalidGroupNameTooLong'));

      return;
    }
    onShowError('');

    if (trimmedGroupName !== originalGroupName || newAvatarObjecturl !== oldAvatarPath) {
      if (isCommunity) {
        void initiateOpenGroupUpdate(conversationId, trimmedGroupName, {
          objectUrl: newAvatarObjecturl,
        });
        closeDialog();
      } else {
        if (PubKey.is03Pubkey(conversationId)) {
          const updateNameAction = groupInfoActions.currentDeviceGroupNameChange({
            groupPk: conversationId,
            newName: trimmedGroupName,
          });
          dispatch(updateNameAction as any);

          return; // keeping the dialog open until the async thunk is done (via isNameChangePending)
        }

        void ClosedGroup.initiateClosedGroupUpdate(conversationId, trimmedGroupName, null);
        closeDialog();
      }
    }
  }

  useKey('Escape', closeDialog);
  useKey('Esc', closeDialog);
  useKey('Enter', onClickOK);

  if (!isClosedGroup && !isCommunity) {
    throw new Error('groupNameUpdate dialog only works for communities and closed groups');
  }

  const okText = window.i18n('ok');
  const cancelText = window.i18n('cancel');
  const titleText = window.i18n('updateGroupDialogTitle', [
    originalGroupName || window.i18n('unknown'),
  ]);

  const isAdmin = !isCommunity;
  // return null;

  return (
    <SessionWrapperModal
      title={titleText}
      onClose={() => closeDialog()}
      additionalClassName="update-group-dialog"
    >
      {errorMsg ? (
        <>
          <SpacerMD />
          <StyledError>{errorMsg}</StyledError>
          <SpacerMD />
        </>
      ) : null}

      <GroupAvatar
        conversationId={conversationId}
        fireInputEvent={fireInputEvent}
        isPublic={isCommunity}
        newAvatarObjecturl={newAvatarObjecturl}
        oldAvatarPath={oldAvatarPath}
      />
      <SpacerMD />

      {isAdmin ? (
        <input
          type="text"
          className="profile-name-input"
          value={newGroupName}
          placeholder={window.i18n('groupNamePlaceholder')}
          onChange={e => setNewGroupName(e.target.value)}
          tabIndex={0}
          required={true}
          aria-required={true}
          autoFocus={true}
          maxLength={Constants.VALIDATION.MAX_GROUP_NAME_LENGTH}
          data-testid="group-name-input"
        />
      ) : null}

      <SessionSpinner loading={isNameChangePending} />

      <div className="session-modal__button-group">
        <SessionButton
          text={okText}
          onClick={onClickOK}
          buttonType={SessionButtonType.Simple}
          disabled={isNameChangePending}
        />
        <SessionButton
          text={cancelText}
          buttonColor={SessionButtonColor.Danger}
          buttonType={SessionButtonType.Simple}
          onClick={closeDialog}
        />
      </div>
    </SessionWrapperModal>
  );
}
