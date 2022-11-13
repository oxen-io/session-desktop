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
import {
  getCurrentNotificationSettingText,
  getSelectedConversation,
  getSelectedConversationIsPublic,
  getSelectedConversationKey,
} from '../../../../state/selectors/conversations';
import { SpacerLG } from '../../../basic/Text';
import { SessionIconButton } from '../../../icon';
import { Avatar, AvatarSize } from '../../../avatar/Avatar';
import { resetRightOverlayMode, setRightOverlayMode } from '../../../../state/ducks/section';
import { PanelButtonGroup, PanelIconButton } from '../../../buttons';
import { ToastUtils } from '../../../../session/utils';
import { useIsPinned, useIsRequest } from '../../../../hooks/useParamSelector';
import { getConversationController } from '../../../../session/conversations';
import { PanelIconButtonWithToggle } from '../../../buttons/PanelIconButton';

type ShowItemProps = { show: boolean };

const HeaderItem = () => {
  const selectedConversationKey = useSelector(getSelectedConversationKey);
  const dispatch = useDispatch();

  if (!selectedConversationKey) {
    return null;
  }

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
      <Avatar size={AvatarSize.XL} pubkey={selectedConversationKey} />
    </div>
  );
};

const InviteContactPublicItem = (props: ShowItemProps) => {
  const selectedConvoId = useSelector(getSelectedConversationKey);

  if (!props.show || !selectedConvoId) {
    return null;
  }
  return (
    <PanelIconButton
      onClick={() => {
        showInviteContactByConvoId(selectedConvoId);
      }}
      text={window.i18n('inviteContacts')}
      disableBg={true}
      iconType={'addUser'}
      dataTestId="add-user-button"
    />
  );
};

const InviteContactClosedItem = (props: ShowItemProps) => {
  const selectedConvoId = useSelector(getSelectedConversationKey);

  if (!props.show || !selectedConvoId) {
    return null;
  }
  return (
    <PanelIconButton
      onClick={() => {
        showInviteContactByConvoId(selectedConvoId);
      }}
      text={window.i18n('inviteContacts')}
      disableBg={true}
      iconType={'addUser'}
      dataTestId="add-user-button"
    />
  );
};

const AddRemoveModsItem = (props: ShowItemProps) => {
  const selectedConvoId = useSelector(getSelectedConversationKey);
  if (!props.show || !selectedConvoId) {
    return null;
  }

  return (
    <>
      <PanelIconButton
        onClick={() => {
          showAddModeratorsByConvoId(selectedConvoId);
        }}
        text={window.i18n('addModerators')}
        disableBg={true}
        iconType={'group'}
      />

      <PanelIconButton
        onClick={() => {
          showRemoveModeratorsByConvoId(selectedConvoId);
        }}
        text={window.i18n('removeModerators')}
        disableBg={true}
        iconType={'group'}
      />
    </>
  );
};

const UpdateGroupNameItem = (props: ShowItemProps) => {
  const selectedConvoId = useSelector(getSelectedConversationKey);
  const selectedIsPublic = useSelector(getSelectedConversationIsPublic);
  if (!props.show || !selectedConvoId) {
    return null;
  }

  const text = selectedIsPublic ? window.i18n('editGroup') : window.i18n('editGroupName');

  return (
    <PanelIconButton
      onClick={async () => {
        await showUpdateGroupNameByConvoId(selectedConvoId);
      }}
      text={text}
      disableBg={true}
      iconType={'group'}
    />
  );
};

const SearchConversationItem = () => {
  console.error('search per conversation TODO');

  return (
    <PanelIconButton
      iconType={'search'}
      text={window.i18n('searchConversation')}
      disableBg={true}
      onClick={() => {
        ToastUtils.pushToastError('DOME', 'DOME');
      }}
    />
  );
};

const AllMediaItem = () => {
  const dispatch = useDispatch();
  return (
    <PanelIconButton
      iconType={'file'}
      text={window.i18n('allMedia')}
      disableBg={true}
      onClick={() => {
        dispatch(setRightOverlayMode({ type: 'show_media', params: null }));
      }}
    />
  );
};

const DisappearingMessageItem = (props: ShowItemProps) => {
  const dispatch = useDispatch();

  if (!props.show) {
    return null;
  }

  return (
    <PanelIconButton
      iconType={'timer50'}
      text={window.i18n('disappearingMessages')}
      disableBg={true}
      onClick={() => {
        dispatch(setRightOverlayMode({ type: 'disappearing_messages', params: null }));
      }}
    />
  );
};

const GroupMembersItem = (props: ShowItemProps) => {
  const selectedConvoId = useSelector(getSelectedConversationKey);

  if (!props.show || !selectedConvoId) {
    return null;
  }

  return (
    <PanelIconButton
      iconType={'group'}
      text={window.i18n('groupMembers')}
      disableBg={true}
      onClick={async () => {
        await showUpdateGroupMembersByConvoId(selectedConvoId);
      }}
    />
  );
};

const LeaveGroupItem = (props: ShowItemProps) => {
  const selectedConvoId = useSelector(getSelectedConversationKey);
  const selectedConvoIdisPublic = useSelector(getSelectedConversationIsPublic);

  if (!props.show || !selectedConvoId) {
    return null;
  }

  const leaveGroupAction = selectedConvoIdisPublic
    ? () => {
        deleteAllMessagesByConvoIdWithConfirmation(selectedConvoId);
      }
    : () => {
        showLeaveGroupByConvoId(selectedConvoId);
      };
  return (
    <PanelIconButton
      iconType={'forbidden'}
      text={window.i18n('leaveGroup')}
      disableBg={true}
      onClick={leaveGroupAction}
    />
  );
};

const DeleteGroupItem = (props: ShowItemProps) => {
  const selectedConvoId = useSelector(getSelectedConversationKey);
  const selectedConvoIdisPublic = useSelector(getSelectedConversationIsPublic);

  if (!props.show || !selectedConvoId) {
    return null;
  }

  const leaveGroupAction = selectedConvoIdisPublic
    ? () => {
        deleteAllMessagesByConvoIdWithConfirmation(selectedConvoId);
      }
    : () => {
        showLeaveGroupByConvoId(selectedConvoId);
      };
  return (
    <PanelIconButton
      iconType={'forbidden'}
      text={window.i18n('leaveGroup')}
      disableBg={true}
      onClick={leaveGroupAction}
    />
  );
};

const PinConversationItem = () => {
  const selectedConvoId = useSelector(getSelectedConversationKey);

  const isRequest = useIsRequest(selectedConvoId);
  const isPinned = useIsPinned(selectedConvoId) || false;

  if (isRequest || !selectedConvoId) {
    return null;
  }

  const conversation = getConversationController().get(selectedConvoId);
  if (!conversation) {
    return null;
  }
  const togglePinConversation = async () => {
    await conversation.setIsPinned(!isPinned);
  };

  const menuText = isPinned ? window.i18n('unpinConversation') : window.i18n('pinConversation');
  return (
    <PanelIconButton
      iconType={'pin'}
      text={menuText}
      disableBg={true}
      onClick={togglePinConversation}
    />
  );
};

const NotificationItem = () => {
  const selectedConvoId = useSelector(getSelectedConversationKey);
  const currentSettingLocalizedString = useSelector(getCurrentNotificationSettingText);
  const dispatch = useDispatch();

  if (!selectedConvoId) {
    return null;
  }

  const conversation = getConversationController().get(selectedConvoId);
  if (!conversation) {
    return null;
  }

  return (
    <PanelIconButton
      iconType={'speaker'}
      text={window.i18n('notificationForConvo')}
      subtitle={currentSettingLocalizedString}
      disableBg={true}
      onClick={() => {
        dispatch(setRightOverlayMode({ type: 'notifications', params: null }));
      }}
    />
  );
};

const AutoDownloadMediaItem = () => {
  const selectedConvoId = useSelector(getSelectedConversationKey);

  if (!selectedConvoId) {
    return null;
  }

  console.error('AutoDownloadMediaItem TODO');

  return (
    <PanelIconButtonWithToggle
      text={window.i18n('autoDownloadMedia')}
      subtitle={window.i18n('autoDownloadMediaDescription')}
      isActive={true}
      disableBg={true}
      onClick={() => {}}
    />
  );
};

// tslint:disable: cyclomatic-complexity
// tslint:disable: max-func-body-length
export const OverlayRightPanelSettings = () => {
  const selectedConversation = useSelector(getSelectedConversation);

  if (!selectedConversation) {
    return null;
  }

  const {
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

  const showUpdateGroupNameButton = Boolean(
    isGroup && (!isPublic || (isPublic && weAreAdmin)) && !commonNoShow
  );
  const showAddRemoveModeratorsButton = Boolean(weAreAdmin && !commonNoShow && isPublic);
  const showUpdateGroupMembersButton = Boolean(!isPublic && isGroup && !commonNoShow);
  const showInviteContactsPublic = Boolean(isPublic && !isKickedFromGroup && !isBlocked && !left);
  const showInviteContactsClosed = Boolean(
    isGroup && !isPublic && !isKickedFromGroup && !isBlocked && !left
  );

  const showLeaveGroup = Boolean(isGroup && !isKickedFromGroup && !left);
  const showDeleteGroup =
    Boolean(isPublic) || Boolean(!isPublic && isGroup && (isKickedFromGroup || left));

  return (
    <>
      <HeaderItem />
      <h2 data-testid="right-panel-group-name">{displayNameInProfile}</h2>
      {showMemberCount && (
        <>
          <SpacerLG />
          <div className="subtle">{window.i18n('members', [`${subscriberCount}`])}</div>
          <SpacerLG />
        </>
      )}
      <PanelButtonGroup>
        <SearchConversationItem />
        <AllMediaItem />
        <InviteContactPublicItem show={showInviteContactsPublic} />
        <InviteContactClosedItem show={showInviteContactsClosed} />
        <PinConversationItem />
        <NotificationItem />
        <DisappearingMessageItem show={hasDisappearingMessagesAvailable} />
        <GroupMembersItem show={showUpdateGroupMembersButton} />
        <AutoDownloadMediaItem />
      </PanelButtonGroup>
      <SpacerLG />
      Admin Settings
      <PanelButtonGroup>
        <UpdateGroupNameItem show={showUpdateGroupNameButton} />
        <AddRemoveModsItem show={showAddRemoveModeratorsButton} />

        <DisappearingMessageItem show={hasDisappearingMessagesAvailable} />
        <GroupMembersItem show={showUpdateGroupMembersButton} />
        <AddRemoveModsItem show={showAddRemoveModeratorsButton} />
      </PanelButtonGroup>
      <SpacerLG />
      Destroying actions
      <PanelButtonGroup>
        <LeaveGroupItem show={showLeaveGroup} />
        <DeleteGroupItem show={showDeleteGroup} />
      </PanelButtonGroup>
    </>
  );
};
