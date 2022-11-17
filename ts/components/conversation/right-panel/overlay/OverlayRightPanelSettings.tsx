import React from 'react';
// tslint:disable-next-line: no-submodule-imports
import { useDispatch } from 'react-redux';
import {
  deleteAllMessagesByConvoIdWithConfirmation,
  showAddModeratorsByConvoId,
  showBanUserByConvoId,
  showInviteContactByConvoId,
  showLeaveGroupByConvoId,
  showRemoveModeratorsByConvoId,
  showUnbanUserByConvoId,
  showUpdateGroupMembersByConvoId,
  showUpdateGroupNameByConvoId,
} from '../../../../interactions/conversationInteractions';

import { SpacerLG } from '../../../basic/Text';
import { SessionIconButton } from '../../../icon';
import { Avatar, AvatarSize } from '../../../avatar/Avatar';
import { resetRightOverlayMode, setRightOverlayMode } from '../../../../state/ducks/section';
import { PanelButtonGroup, PanelIconButton } from '../../../buttons';
import { ToastUtils } from '../../../../session/utils';
import {
  useIsClosedGroup,
  useIsKickedFromGroup,
  useIsLeft,
  useIsPinned,
  useIsPrivate,
  useIsPublic,
  useIsRequest,
} from '../../../../hooks/useParamSelector';
import { getConversationController } from '../../../../session/conversations';
import { PanelIconButtonWithToggle } from '../../../buttons/PanelIconButton';
import {
  showBanUnbanUser,
  showDeleteContactOnly,
  showDeleteLeftClosedGroup,
  showDeleteMessagesItem,
  showLeaveOpenGroup,
} from '../../../menu/Menu';
import styled from 'styled-components';
import { updateConfirmModal } from '../../../../state/ducks/modalDialog';
import { SessionButtonColor } from '../../../basic/SessionButton';
import {
  useSelectedConversationKey,
  useSelectedDisplayNameInProfile,
  useSelectedIsActive,
  useSelectedIsBlocked,
  useSelectedIsKickedFromGroup,
  useSelectedIsLeft,
  useSelectedIsOpenOrClosedGroup,
  useSelectedIsPublic,
  useSelectedNotificationSettingText,
  useSelectedSubsbriberCount,
  useSelectedWeAreAdmin,
} from '../../../../state/selectors/selectedConversation';

type ShowItemProps = { show: boolean };

const BackButtonContainer = styled.div``;

const HeaderItem = () => {
  const selectedConversationKey = useSelectedConversationKey();
  const dispatch = useDispatch();

  if (!selectedConversationKey) {
    return null;
  }

  return (
    <div className="right-panel-header">
      <BackButtonContainer>
        <SessionIconButton
          iconType="chevron"
          iconSize="medium"
          iconRotation={270}
          onClick={() => {
            dispatch(resetRightOverlayMode());
          }}
          dataTestId="back-button-conversation-options"
        />
      </BackButtonContainer>
      <Avatar size={AvatarSize.XL} pubkey={selectedConversationKey} />
    </div>
  );
};

const InviteContactPublicItem = (props: ShowItemProps) => {
  const selectedConvoId = useSelectedConversationKey();

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
  const selectedConvoId = useSelectedConversationKey();

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
  const selectedConvoId = useSelectedConversationKey();
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
        iconType={'addModerator'}
      />

      <PanelIconButton
        onClick={() => {
          showRemoveModeratorsByConvoId(selectedConvoId);
        }}
        text={window.i18n('removeModerators')}
        disableBg={true}
        iconType={'deleteModerator'}
      />
    </>
  );
};

const UpdateGroupNameItem = (props: ShowItemProps) => {
  const selectedConvoId = useSelectedConversationKey();
  const selectedIsPublic = useSelectedIsPublic();
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
  const selectedConvoId = useSelectedConversationKey();

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

const ClearMessagesItem = () => {
  const selectedConvoId = useSelectedConversationKey();
  const isRequest = useIsRequest(selectedConvoId);

  if (!selectedConvoId) {
    return null;
  }

  if (!showDeleteMessagesItem(isRequest)) {
    return null;
  }

  return (
    <PanelIconButton
      iconType={'clearMessages'}
      text={window.i18n('clearMessages')}
      disableBg={true}
      onClick={() => {
        deleteAllMessagesByConvoIdWithConfirmation(selectedConvoId);
      }}
    />
  );
};

const LeaveClosedGroupItem = () => {
  const selectedConvoId = useSelectedConversationKey();
  const selectedConvoIdisGroup = useIsClosedGroup(selectedConvoId);

  const isKickedFromGroup = useIsKickedFromGroup(selectedConvoId);
  const left = useIsLeft(selectedConvoId);

  if (!selectedConvoId || !selectedConvoIdisGroup || isKickedFromGroup || left) {
    return null;
  }

  const leaveGroupAction = () => {
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

const BanMenuItem = (props: ShowItemProps): JSX.Element | null => {
  const selectedConvoId = useSelectedConversationKey();

  if (!props.show || !selectedConvoId) {
    return null;
  }
  return (
    <PanelIconButton
      iconType={'banUser'}
      text={window.i18n('banUser')}
      disableBg={true}
      onClick={() => {
        showBanUserByConvoId(selectedConvoId);
      }}
    />
  );
};

const UnbanMenuItem = (props: ShowItemProps): JSX.Element | null => {
  const selectedConvoId = useSelectedConversationKey();

  if (!props.show || !selectedConvoId) {
    return null;
  }
  return (
    <PanelIconButton
      iconType={'unbanUser'}
      text={window.i18n('unbanUser')}
      disableBg={true}
      onClick={() => {
        showUnbanUserByConvoId(selectedConvoId);
      }}
    />
  );
};

const DeleteContactItem = () => {
  const dispatch = useDispatch();
  const selectedConvoId = useSelectedConversationKey();
  const isPrivate = useIsPrivate(selectedConvoId);
  const isClosedGroup = useIsClosedGroup(selectedConvoId);
  const isKickedFromGroup = useIsKickedFromGroup(selectedConvoId);
  const hasLeft = useIsLeft(selectedConvoId);
  const isRequest = useIsRequest(selectedConvoId);

  if (!selectedConvoId) {
    return null;
  }

  if (
    showDeleteContactOnly({
      isPrivate,
      isRequest,
    }) ||
    showDeleteLeftClosedGroup({ isClosedGroup, left: hasLeft, isKickedFromGroup })
  ) {
    const menuItemText = isClosedGroup
      ? window.i18n('editMenuDeleteGroup')
      : window.i18n('editMenuDeleteContact');

    const onClickClose = () => {
      dispatch(updateConfirmModal(null));
    };

    const showConfirmationModal = () => {
      dispatch(
        updateConfirmModal({
          title: menuItemText,
          message: window.i18n('deleteContactConfirmation'),
          onClickClose,
          okTheme: SessionButtonColor.Danger,
          onClickOk: async () => {
            await getConversationController().deleteContact(selectedConvoId);
          },
        })
      );
    };

    return (
      <PanelIconButton
        iconType={'forbidden'}
        text={menuItemText}
        disableBg={true}
        onClick={showConfirmationModal}
      />
    );
  }
  return null;
};

const DeleteOpenGroupItem = () => {
  const selectedConvoId = useSelectedConversationKey();
  const dispatch = useDispatch();
  const isPublic = useIsPublic(selectedConvoId);
  const isKickedFromGroup = useIsKickedFromGroup(selectedConvoId);
  const left = useIsLeft(selectedConvoId);

  const showDeleteOpenGroupItem = showLeaveOpenGroup({ isKickedFromGroup, isPublic, left });

  if (!selectedConvoId || !showDeleteOpenGroupItem) {
    return null;
  }

  const onClickClose = () => {
    dispatch(updateConfirmModal(null));
  };

  const showConfirmationModal = () => {
    dispatch(
      updateConfirmModal({
        title: window.i18n('leaveGroup'),
        message: window.i18n('leaveGroupConfirmation'),
        onClickClose,
        okTheme: SessionButtonColor.Danger,
        onClickOk: async () => {
          await getConversationController().deleteContact(selectedConvoId);
        },
      })
    );
  };

  return (
    <PanelIconButton
      iconType={'forbidden'}
      text={window.i18n('leaveGroup')}
      disableBg={true}
      onClick={showConfirmationModal}
    />
  );
};

const PinConversationItem = () => {
  const selectedConvoId = useSelectedConversationKey();

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
  const selectedConvoId = useSelectedConversationKey();
  const currentSettingLocalizedString = useSelectedNotificationSettingText();
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
  const selectedConvoId = useSelectedConversationKey();

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
      onClick={() => {
        console.error('AutoDownloadMediaItem TODO');
      }}
    />
  );
};

const StyledTitleGroup = styled.div`
  color: var(--text-secondary-color);
  align-self: flex-start;
  margin-inline-start: calc(var(--margins-lg) * 2);
  margin-block-end: var(--margins-xs);
`;

// tslint:disable: cyclomatic-complexity
// tslint:disable: max-func-body-length
export const OverlayRightPanelSettings = () => {
  const selectedConversationId = useSelectedConversationKey();
  const isPublic = useSelectedIsPublic();
  const isBlocked = useSelectedIsBlocked();
  const isGroup = useSelectedIsOpenOrClosedGroup();
  const isActive = useSelectedIsActive();
  const displayNameInProfile = useSelectedDisplayNameInProfile();
  const isKickedFromGroup = useSelectedIsKickedFromGroup();
  const left = useSelectedIsLeft();
  const weAreAdmin = useSelectedWeAreAdmin();
  const subscriberCount = useSelectedSubsbriberCount();

  if (!selectedConversationId) {
    return null;
  }

  const showMemberCount = !!(subscriberCount && subscriberCount > 0);
  const commonNoShow = isKickedFromGroup || left || isBlocked || !isActive;
  const hasDisappearingMessagesGroupAvailable = !isPublic && isGroup && !commonNoShow;
  const hasDisappearingMessagesPrivateAvailable = !isGroup && !commonNoShow;

  const showUpdateGroupNameButton = Boolean(
    isGroup && (!isPublic || (isPublic && weAreAdmin)) && !commonNoShow
  );
  const showAddRemoveModeratorsButton = Boolean(weAreAdmin && !commonNoShow && isPublic);
  const showUpdateGroupMembersButton = Boolean(!isPublic && isGroup && !commonNoShow);
  const showInviteContactsPublic = Boolean(isPublic && !isKickedFromGroup && !isBlocked && !left);
  const showInviteContactsClosed = Boolean(
    isGroup && !isPublic && !isKickedFromGroup && !isBlocked && !left
  );

  const showBanUnbanUserItem = showBanUnbanUser(weAreAdmin, isPublic, isKickedFromGroup);

  const showAdminSettings =
    isGroup &&
    (showUpdateGroupNameButton ||
      showAddRemoveModeratorsButton ||
      hasDisappearingMessagesGroupAvailable ||
      showUpdateGroupMembersButton ||
      showAddRemoveModeratorsButton);

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
        <DisappearingMessageItem show={hasDisappearingMessagesPrivateAvailable} />
        <GroupMembersItem show={showUpdateGroupMembersButton} />
        <AutoDownloadMediaItem />
      </PanelButtonGroup>
      <SpacerLG />
      {showAdminSettings && (
        <>
          <StyledTitleGroup>{window.i18n('adminSettings')}</StyledTitleGroup>
          <PanelButtonGroup>
            <UpdateGroupNameItem show={showUpdateGroupNameButton} />
            <DisappearingMessageItem show={hasDisappearingMessagesGroupAvailable} />
            <GroupMembersItem show={showUpdateGroupMembersButton} />
            <AddRemoveModsItem show={showAddRemoveModeratorsButton} />
            <BanMenuItem show={showBanUnbanUserItem} />
            <UnbanMenuItem show={showBanUnbanUserItem} />
          </PanelButtonGroup>
        </>
      )}
      <SpacerLG />
      {/* we can always ClearMessages locally so this panel group is always shown  */}
      <PanelButtonGroup style={{ color: 'var(--danger-color)', marginBottom: 'var(--margins-lg)' }}>
        <ClearMessagesItem />
        <DeleteContactItem />
        <LeaveClosedGroupItem />
        <DeleteOpenGroupItem />
      </PanelButtonGroup>
    </>
  );
};
