import React, { useContext } from 'react';

import { Item, Submenu } from 'react-contexify';
import { useDispatch, useSelector } from 'react-redux';
import {
  useAvatarPath,
  useConversationUsername,
  useHasNickname,
  useIsActive,
  useIsBlinded,
  useIsBlocked,
  useIsKickedFromGroup,
  useIsLeft,
  useIsMe,
  useIsPrivate,
  useIsPublic,
  useIsRequest,
  useWeAreAdmin,
} from '../../hooks/useParamSelector';
import {
  approveConvoAndSendResponse,
  blockConvoById,
  clearNickNameByConvoId,
  copyPublicKeyByConvoId,
  declineConversationWithConfirm,
  markAllReadByConvoId,
  setDisappearingMessagesByConvoId,
  showAddModeratorsByConvoId,
  showInviteContactByConvoId,
  showRemoveModeratorsByConvoId,
  showUpdateGroupNameByConvoId,
  unblockConvoById,
} from '../../interactions/conversationInteractions';

import { getConversationController } from '../../session/conversations';
import { changeNickNameModal, updateUserDetailsModal } from '../../state/ducks/modalDialog';
import { SectionType } from '../../state/ducks/section';
import { hideMessageRequestBanner } from '../../state/ducks/userConfig';
import { useFocusedSection } from '../../state/selectors/section';
import { getTimerOptions } from '../../state/selectors/timerOptions';
import { ContextConversationId } from '../leftpane/conversation-list-item/ConversationListItem';

function showTimerOptions(
  isPublic: boolean,
  isKickedFromGroup: boolean,
  left: boolean,
  isBlocked: boolean,
  isRequest: boolean,
  isActive: boolean
): boolean {
  return !isPublic && !left && !isKickedFromGroup && !isBlocked && !isRequest && isActive;
}

function showBlock(isMe: boolean, isPrivate: boolean, isRequest: boolean): boolean {
  return !isMe && isPrivate && !isRequest;
}

function showClearNickname(
  isMe: boolean,
  hasNickname: boolean,
  isPrivate: boolean,
  isRequest: boolean
): boolean {
  return !isMe && hasNickname && isPrivate && !isRequest;
}

function showChangeNickname(isMe: boolean, isPrivate: boolean, isRequest: boolean) {
  return !isMe && isPrivate && !isRequest;
}

// we want to show the copyId for open groups and private chats only
function showCopyId(isPublic: boolean, isPrivate: boolean, isBlinded: boolean): boolean {
  return (isPrivate && !isBlinded) || isPublic;
}

export function showDeleteContactOnly({
  isPrivate,
  isRequest,
}: {
  isPrivate: boolean;
  isRequest: boolean;
}): boolean {
  // we want to show that item only if this is a private chat and not a request

  return isPrivate && !isRequest;
}

/**
 * Before removing a closed group we must leave it. That's why we have two buttons for two different actions.
 *
 * You can leave a closed group without removing the corresponding conversation.

 */
export function showDeleteLeftClosedGroup({
  isClosedGroup,
  left,
  isKickedFromGroup,
}: {
  isClosedGroup: boolean;
  left: boolean;
  isKickedFromGroup: boolean;
}): boolean {
  // we want to show that item only if this is a private chat and not a request

  return isClosedGroup && (left || isKickedFromGroup);
}

export const showBanUnbanUser = (
  weAreAdmin: boolean,
  isPublic: boolean,
  isKickedFromGroup: boolean
) => {
  return !isKickedFromGroup && weAreAdmin && isPublic;
};

function showAddModerators(
  weAreAdmin: boolean,
  isPublic: boolean,
  isKickedFromGroup: boolean
): boolean {
  return !isKickedFromGroup && weAreAdmin && isPublic;
}

function showRemoveModerators(
  weAreAdmin: boolean,
  isPublic: boolean,
  isKickedFromGroup: boolean
): boolean {
  return !isKickedFromGroup && weAreAdmin && isPublic;
}

function showUpdateGroupName(
  weAreAdmin: boolean,
  isKickedFromGroup: boolean,
  left: boolean
): boolean {
  return !isKickedFromGroup && !left && weAreAdmin;
}

/**
 * Returns true for a closed group we are not kicked out or left.
 * For a public group, we use the `showOpenGroup`
 */
export function showLeaveGroup({
  isGroup,
  isKickedFromGroup,
  isPublic,
  left,
}: {
  isKickedFromGroup: boolean;
  left: boolean;
  isGroup: boolean;
  isPublic: boolean;
}): boolean {
  return !isKickedFromGroup && !left && isGroup && !isPublic;
}

/**
 * Returns true for an open group we have not left.
 */
export function showLeaveOpenGroup({
  isKickedFromGroup,
  isPublic,
  left,
}: {
  isKickedFromGroup: boolean;
  left: boolean;
  isPublic: boolean;
}): boolean {
  return !isKickedFromGroup && !left && isPublic;
}

function showInviteContact(isPublic: boolean): boolean {
  return isPublic;
}

/** Menu items standardized */

export const InviteContactMenuItem = (): JSX.Element | null => {
  const convoId = useContext(ContextConversationId);
  const isPublic = useIsPublic(convoId);

  if (showInviteContact(isPublic)) {
    return (
      <Item
        onClick={() => {
          showInviteContactByConvoId(convoId);
        }}
      >
        {window.i18n('inviteContacts')}
      </Item>
    );
  }
  return null;
};

export const PinConversationMenuItem = (): JSX.Element | null => {
  const conversationId = useContext(ContextConversationId);
  const isMessagesSection = useFocusedSection() === SectionType.Message;
  const isRequest = useIsRequest(conversationId);

  if (isMessagesSection && !isRequest) {
    const conversation = getConversationController().get(conversationId);
    const isPinned = conversation?.isPinned() || false;

    const togglePinConversation = async () => {
      await conversation?.setIsPinned(!isPinned);
    };

    const menuText = isPinned ? window.i18n('unpinConversation') : window.i18n('pinConversation');
    return <Item onClick={togglePinConversation}>{menuText}</Item>;
  }
  return null;
};

export const ShowUserDetailsMenuItem = () => {
  const dispatch = useDispatch();
  const convoId = useContext(ContextConversationId);
  const isPrivate = useIsPrivate(convoId);
  const avatarPath = useAvatarPath(convoId);
  const userName = useConversationUsername(convoId) || convoId;
  const isBlinded = useIsBlinded(convoId);

  if (isPrivate && !isBlinded) {
    return (
      <Item
        onClick={() => {
          dispatch(
            updateUserDetailsModal({
              conversationId: convoId,
              userName,
              authorAvatarPath: avatarPath,
            })
          );
        }}
      >
        {window.i18n('showUserDetails')}
      </Item>
    );
  }

  return null;
};

export const UpdateGroupNameMenuItem = () => {
  const convoId = useContext(ContextConversationId);
  const left = useIsLeft(convoId);
  const isKickedFromGroup = useIsKickedFromGroup(convoId);
  const weAreAdmin = useWeAreAdmin(convoId);

  if (showUpdateGroupName(weAreAdmin, isKickedFromGroup, left)) {
    return (
      <Item
        onClick={async () => {
          await showUpdateGroupNameByConvoId(convoId);
        }}
      >
        {window.i18n('editGroup')}
      </Item>
    );
  }
  return null;
};

export const RemoveModeratorsMenuItem = (): JSX.Element | null => {
  const convoId = useContext(ContextConversationId);
  const isPublic = useIsPublic(convoId);
  const isKickedFromGroup = useIsKickedFromGroup(convoId);
  const weAreAdmin = useWeAreAdmin(convoId);

  if (showRemoveModerators(weAreAdmin, Boolean(isPublic), Boolean(isKickedFromGroup))) {
    return (
      <Item
        onClick={() => {
          showRemoveModeratorsByConvoId(convoId);
        }}
      >
        {window.i18n('removeModerators')}
      </Item>
    );
  }
  return null;
};

export const AddModeratorsMenuItem = (): JSX.Element | null => {
  const convoId = useContext(ContextConversationId);
  const isPublic = useIsPublic(convoId);
  const isKickedFromGroup = useIsKickedFromGroup(convoId);
  const weAreAdmin = useWeAreAdmin(convoId);

  if (showAddModerators(weAreAdmin, isPublic, isKickedFromGroup)) {
    return (
      <Item
        onClick={() => {
          showAddModeratorsByConvoId(convoId);
        }}
      >
        {window.i18n('addModerators')}
      </Item>
    );
  }
  return null;
};

export const CopyMenuItem = (): JSX.Element | null => {
  const convoId = useContext(ContextConversationId);
  const isPublic = useIsPublic(convoId);
  const isPrivate = useIsPrivate(convoId);
  const isBlinded = useIsBlinded(convoId);

  if (showCopyId(isPublic, isPrivate, isBlinded)) {
    const copyIdLabel = isPublic ? window.i18n('copyOpenGroupURL') : window.i18n('copySessionID');
    return <Item onClick={() => copyPublicKeyByConvoId(convoId)}>{copyIdLabel}</Item>;
  }
  return null;
};

export const MarkAllReadMenuItem = (): JSX.Element | null => {
  const convoId = useContext(ContextConversationId);
  const isRequest = useIsRequest(convoId);
  if (!isRequest) {
    return (
      <Item onClick={() => markAllReadByConvoId(convoId)}>{window.i18n('markAllAsRead')}</Item>
    );
  } else {
    return null;
  }
};

export const DisappearingMessageMenuItem = (): JSX.Element | null => {
  const convoId = useContext(ContextConversationId);
  const isBlocked = useIsBlocked(convoId);
  const isActive = useIsActive(convoId);
  const isPublic = useIsPublic(convoId);
  const isLeft = useIsLeft(convoId);
  const isKickedFromGroup = useIsKickedFromGroup(convoId);
  const timerOptions = useSelector(getTimerOptions).timerOptions;
  const isRequest = useIsRequest(convoId);

  if (
    showTimerOptions(
      Boolean(isPublic),
      Boolean(isKickedFromGroup),
      Boolean(isLeft),
      Boolean(isBlocked),
      isRequest,
      isActive
    )
  ) {
    // const isRtlMode = isRtlBody();

    return (
      // Remove the && false to make context menu work with RTL support
      <Submenu
        label={window.i18n('disappearingMessages')}
        // rtl={isRtlMode && false}
      >
        {timerOptions.map(item => (
          <Item
            key={item.value}
            onClick={async () => {
              await setDisappearingMessagesByConvoId(convoId, item.value);
            }}
          >
            {item.name}
          </Item>
        ))}
      </Submenu>
    );
  }
  return null;
};

export function isRtlBody(): boolean {
  const body = document.getElementsByTagName('body').item(0);

  return body?.classList.contains('rtl') || false;
}

export const BlockMenuItem = (): JSX.Element | null => {
  const convoId = useContext(ContextConversationId);
  const isMe = useIsMe(convoId);
  const isBlocked = useIsBlocked(convoId);
  const isPrivate = useIsPrivate(convoId);
  const isRequest = useIsRequest(convoId);

  if (showBlock(Boolean(isMe), Boolean(isPrivate), Boolean(isRequest))) {
    const blockTitle = isBlocked ? window.i18n('unblockUser') : window.i18n('blockUser');
    const blockHandler = isBlocked
      ? () => unblockConvoById(convoId)
      : () => blockConvoById(convoId);
    return <Item onClick={blockHandler}>{blockTitle}</Item>;
  }
  return null;
};

export const ClearNicknameMenuItem = (): JSX.Element | null => {
  const convoId = useContext(ContextConversationId);
  const isMe = useIsMe(convoId);
  const hasNickname = useHasNickname(convoId);
  const isPrivate = useIsPrivate(convoId);
  const isRequest = Boolean(useIsRequest(convoId)); // easier to copy paste

  if (showClearNickname(Boolean(isMe), Boolean(hasNickname), Boolean(isPrivate), isRequest)) {
    return (
      <Item onClick={() => clearNickNameByConvoId(convoId)}>{window.i18n('clearNickname')}</Item>
    );
  }
  return null;
};

export const ChangeNicknameMenuItem = () => {
  const convoId = useContext(ContextConversationId);
  const isMe = useIsMe(convoId);
  const isPrivate = useIsPrivate(convoId);
  const isRequest = useIsRequest(convoId);

  const dispatch = useDispatch();
  if (showChangeNickname(isMe, isPrivate, isRequest)) {
    return (
      <Item
        onClick={() => {
          dispatch(changeNickNameModal({ conversationId: convoId }));
        }}
      >
        {window.i18n('changeNickname')}
      </Item>
    );
  }
  return null;
};

export function showDeleteMessagesItem(isRequest: boolean) {
  return !isRequest;
}

export const HideBannerMenuItem = (): JSX.Element => {
  const dispatch = useDispatch();
  return (
    <Item
      onClick={() => {
        dispatch(hideMessageRequestBanner());
      }}
    >
      {window.i18n('hideBanner')}
    </Item>
  );
};

export const AcceptMenuItem = () => {
  const convoId = useContext(ContextConversationId);
  const isRequest = useIsRequest(convoId);
  const convo = getConversationController().get(convoId);

  if (isRequest) {
    return (
      <Item
        onClick={async () => {
          await convo.setDidApproveMe(true);
          await convo.addOutgoingApprovalMessage(Date.now());
          await approveConvoAndSendResponse(convoId, true);
        }}
      >
        {window.i18n('accept')}
      </Item>
    );
  }
  return null;
};

export const DeclineMenuItem = () => {
  const convoId = useContext(ContextConversationId);
  const isRequest = useIsRequest(convoId);

  if (isRequest) {
    return (
      <Item
        onClick={() => {
          declineConversationWithConfirm(convoId, true);
        }}
      >
        {window.i18n('decline')}
      </Item>
    );
  }
  return null;
};
