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
  showDeleteContactOnly,
  showDeleteLeftClosedGroup,
  showDeleteMessagesItem,
  showLeaveOpenGroup,
} from '../../../menu/Menu';
import styled from 'styled-components';
import {
  promoteAdminToClosedGroup,
  showReadOnlyGroupMembersModal,
  updateClosedGroupModal,
  updateConfirmModal,
  updatePublicGroupNameModal,
} from '../../../../state/ducks/modalDialog';
import { SessionButtonColor } from '../../../basic/SessionButton';
import {
  useSelectedConversationKey,
  useSelectedDisplayNameInProfile,
  useSelectedIsActive,
  useSelectedIsBlocked,
  useSelectedIsClosedGroup,
  useSelectedIsClosedGroupV3,
  useSelectedIsKickedFromGroup,
  useSelectedIsLeft,
  useSelectedIsOpenOrClosedGroup,
  useSelectedIsPublic,
  useSelectedNotificationSettingText,
  useSelectedSubsbriberCount,
  useSelectedWeAreAdmin,
} from '../../../../state/selectors/selectedConversation';
import { ConversationTypeEnum } from '../../../../models/conversationAttributes';
import { StyledPanelGroupTitle } from '../../../buttons/PanelButton';

type ShowItemProps = { show: boolean };

function assertOrThrow(throwIfTrue: boolean, message: string) {
  if (throwIfTrue) {
    throw new Error(message);
  }
}

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
  const selectedIsPublic = useSelectedIsPublic();

  if (!props.show || !selectedConvoId) {
    return null;
  }

  assertOrThrow(!selectedIsPublic, 'Invite public needs open group chat');
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
  const selectedIsPublic = useSelectedIsPublic();

  if (!props.show || !selectedConvoId) {
    return null;
  }
  assertOrThrow(!selectedIsPublic, 'add/remove mods needs open group chat');

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

async function createAllConvosForClosedGroupMembers(conversationId: string) {
  const groupConvo = getConversationController().get(conversationId);
  if (!groupConvo) {
    throw new Error('createAllConvosForClosedGroupMembers needs a groupconvo');
  }
  // make sure all the members' convo exists so we can add or remove them
  await Promise.all(
    groupConvo
      .get('members')
      .map(m => getConversationController().getOrCreateAndWait(m, ConversationTypeEnum.PRIVATE))
  );
}

const UpdateGroupNamePublicItem = (props: ShowItemProps) => {
  const dispatch = useDispatch();
  const selectedConvoId = useSelectedConversationKey();
  const selectedIsPublic = useSelectedIsPublic();
  /**
   * closed groups name update is made from the Edit Group menu, not from here anymore
   */
  if (!props.show || !selectedConvoId) {
    return null;
  }
  assertOrThrow(!selectedIsPublic, 'update group name public needs open group chat');

  const text = window.i18n('editGroup');

  return (
    <PanelIconButton
      onClick={async () => {
        await createAllConvosForClosedGroupMembers(selectedConvoId);
        dispatch(updatePublicGroupNameModal({ conversationId: selectedConvoId }));
      }}
      text={text}
      disableBg={true}
      iconType={'group'}
    />
  );
};

const UpdateClosedGroupItem = (props: ShowItemProps) => {
  const dispatch = useDispatch();
  const selectedConvoId = useSelectedConversationKey();
  const isClosedGroup = useSelectedIsClosedGroup();

  /**
   * closed groups name update is made from the Edit Group menu, not from here anymore
   */
  if (!props.show || !selectedConvoId) {
    return null;
  }
  assertOrThrow(!isClosedGroup, 'update closed group needs closed group chat');

  const text = window.i18n('editGroup');

  return (
    <PanelIconButton
      onClick={async () => {
        await createAllConvosForClosedGroupMembers(selectedConvoId);
        dispatch(updateClosedGroupModal({ conversationId: selectedConvoId }));
      }}
      text={text}
      disableBg={true}
      iconType={'group'}
    />
  );
};

const PromoteAdminClosedGroupItem = (props: ShowItemProps) => {
  const dispatch = useDispatch();
  const selectedConvoId = useSelectedConversationKey();
  const isClosedGroupV3 = useSelectedIsClosedGroup();
  console.warn('promote admin todo ');

  /**
   * closed groups name update is made from the Edit Group menu, not from here anymore
   */
  if (!props.show || !selectedConvoId) {
    return null;
  }
  assertOrThrow(!isClosedGroupV3, 'Promote admin only works for closed group v3');

  return (
    <PanelIconButton
      onClick={async () => {
        await createAllConvosForClosedGroupMembers(selectedConvoId);
        dispatch(promoteAdminToClosedGroup({ conversationId: selectedConvoId }));
      }}
      text={window.i18n('addModerators')}
      disableBg={true}
      iconType={'addModerator'}
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

/**
 * Read only, no change allowed from the dialog shown in this one
 */
const ReadOnlyGroupMembersItem = (props: ShowItemProps) => {
  const selectedConvoId = useSelectedConversationKey();
  const weAreAdmin = useSelectedWeAreAdmin();
  const isPublic = useSelectedWeAreAdmin();
  const dispatch = useDispatch();

  if (!props.show || !selectedConvoId) {
    return null;
  }
  //group member when we are admin is shown in the group update now
  assertOrThrow(
    weAreAdmin || isPublic,
    'ReadOnlyGroupMembersItem only used for closed group where we are not admins'
  );
  return (
    <PanelIconButton
      iconType={'group'}
      text={window.i18n('groupMembers')}
      disableBg={true}
      onClick={async () => {
        await createAllConvosForClosedGroupMembers(selectedConvoId);
        dispatch(showReadOnlyGroupMembersModal({ conversationId: selectedConvoId }));
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

const BanUnbanMenUItem = (props: ShowItemProps) => {
  if (props.show) {
    return (
      <>
        <BanMenuItem show={props.show} />
        <UnbanMenuItem show={props.show} />
      </>
    );
  }
  return null;
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

const showBanUnbanUser = (weAreAdmin: boolean, isPublic: boolean, isKickedFromGroup: boolean) => {
  return !isKickedFromGroup && weAreAdmin && isPublic;
};

// tslint:disable: cyclomatic-complexity
// tslint:disable: max-func-body-length
export const OverlayRightPanelSettings = () => {
  const selectedConversationId = useSelectedConversationKey();
  const isPublic = useSelectedIsPublic();
  const isBlocked = useSelectedIsBlocked();
  const isGroup = useSelectedIsOpenOrClosedGroup();
  const isClosedGroup = useSelectedIsClosedGroup();
  const isClosedGroupV3 = useSelectedIsClosedGroupV3();
  const isActive = useSelectedIsActive();
  const displayNameInProfile = useSelectedDisplayNameInProfile();
  const isKickedFromGroup = useSelectedIsKickedFromGroup();
  const left = useSelectedIsLeft();
  const weAreAdmin = useSelectedWeAreAdmin();
  const subscriberCount = useSelectedSubsbriberCount();

  if (!selectedConversationId) {
    return null;
  }
  const commonNoShow = isKickedFromGroup || left || isBlocked || !isActive;
  const hasDisappearingMessagesPrivateAvailable = !isGroup && !commonNoShow;

  /**
   * Open or closed groups toggle show/hide
   */
  const showMemberCount = !!(subscriberCount && subscriberCount > 0);

  /**
   * Closed groups toggle show/hide buttons.
   * Notes:
   * 1. We want the group name update inside the "Edit Group" modal now.
   * 2. An admin of a v3 closed group should only see the Edit Group and not the Show Members button
   */
  const hasDisappearingMessagesGroupAvailable =
    isClosedGroup && !commonNoShow && ((isClosedGroupV3 && weAreAdmin) || !isClosedGroupV3);
  const showEditClosedGroupButton = Boolean(isClosedGroup && weAreAdmin && !commonNoShow);
  const showReadOnlyMembers = !commonNoShow && !weAreAdmin && isClosedGroup;
  const showPromoteAdminButton = weAreAdmin && isClosedGroupV3 && !commonNoShow;

  /**
   * Public groups toggle show/hide buttons
   */
  const showInviteContactsPublic = Boolean(isPublic && !isKickedFromGroup && !isBlocked && !left);
  const showUpdateGroupNameButtonPublic = Boolean(isPublic && weAreAdmin && !commonNoShow);
  const showAddRemoveModeratorsButton = Boolean(weAreAdmin && !commonNoShow && isPublic);
  const showBanUnbanUserItem = showBanUnbanUser(weAreAdmin, isPublic, isKickedFromGroup);

  /**
   * Decide if we need to show the "Admin Settings" section at all or not
   */

  const adminSettingsClosedGroupShown =
    isClosedGroup &&
    (hasDisappearingMessagesGroupAvailable ||
      hasDisappearingMessagesGroupAvailable ||
      showPromoteAdminButton ||
      showEditClosedGroupButton);
  const adminSettingsPublicGroupShown =
    isPublic &&
    (showUpdateGroupNameButtonPublic || showAddRemoveModeratorsButton || showBanUnbanUserItem);

  const showAdminSettings =
    isGroup && (adminSettingsClosedGroupShown || adminSettingsPublicGroupShown);

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
        <PinConversationItem />
        <NotificationItem />
        <DisappearingMessageItem show={hasDisappearingMessagesPrivateAvailable} />
        <ReadOnlyGroupMembersItem show={showReadOnlyMembers} />
        <AutoDownloadMediaItem />
      </PanelButtonGroup>
      <SpacerLG />
      {showAdminSettings && (
        <>
          <StyledPanelGroupTitle>{window.i18n('adminSettings')}</StyledPanelGroupTitle>
          <PanelButtonGroup>
            {isClosedGroup && (
              <>
                <UpdateClosedGroupItem show={showEditClosedGroupButton} />
                <DisappearingMessageItem show={hasDisappearingMessagesGroupAvailable} />{' '}
                <PromoteAdminClosedGroupItem show={showPromoteAdminButton} />
              </>
            )}

            {isPublic && (
              <>
                <UpdateGroupNamePublicItem show={showUpdateGroupNameButtonPublic} />
                <AddRemoveModsItem show={showAddRemoveModeratorsButton} />
                <BanUnbanMenUItem show={showBanUnbanUserItem} />
              </>
            )}
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
