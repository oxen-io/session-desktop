import React from 'react';

import styled from 'styled-components';
import { ConversationNotificationSettingType } from '../../models/conversationAttributes';
import {
  getConversationHeaderTitleProps,
  getCurrentNotificationSettingText,
  getIsSelectedActive,
  getIsSelectedBlocked,
  getIsSelectedNoteToSelf,
  getIsSelectedPrivate,
  getSelectedConversationIsPublic,
  getSelectedConversationKey,
  getSelectedMessageIds,
  isMessageSelectionMode,
} from '../../state/selectors/conversations';
import { useDispatch, useSelector } from 'react-redux';

import {
  deleteMessagesById,
  deleteMessagesByIdForEveryone,
} from '../../interactions/conversations/unsendingInteractions';
import { resetSelectedMessageIds } from '../../state/ducks/conversations';
import { callRecipient } from '../../interactions/conversationInteractions';
import { getHasIncomingCall, getHasOngoingCall } from '../../state/selectors/call';
import {
  useConversationUsername,
  // useExpireTimer,
  // useIsKickedFromGroup,
  useIsRequest,
} from '../../hooks/useParamSelector';
import {
  SessionButton,
  SessionButtonColor,
  SessionButtonShape,
  SessionButtonType,
} from '../basic/SessionButton';
import { SessionIconButton } from '../icon';
import { Flex } from '../basic/Flex';
// import { ExpirationTimerOptions } from '../../util/expiringMessages';
import { resetRightOverlayMode, setRightOverlayMode } from '../../state/ducks/section';
import { getRightOverlayMode, isRightOverlayShown } from '../../state/selectors/section';

export interface TimerOption {
  name: string;
  value: number;
}

export type ConversationHeaderProps = {
  conversationKey: string;
  name?: string;

  profileName?: string;
  avatarPath: string | null;

  isMe: boolean;
  isGroup: boolean;
  isPrivate: boolean;
  isPublic: boolean;
  weAreAdmin: boolean;

  // We might not always have the full list of members,
  // e.g. for open groups where we could have thousands
  // of members. We'll keep this for now (for closed chats)
  members: Array<any>;

  // not equal members.length (see above)
  subscriberCount?: number;

  expirationSettingName?: string;
  currentNotificationSetting: ConversationNotificationSettingType;
  hasNickname: boolean;

  isBlocked: boolean;

  isKickedFromGroup: boolean;
  left: boolean;
};

const SelectionOverlay = () => {
  const selectedMessageIds = useSelector(getSelectedMessageIds);
  const selectedConversationKey = useSelector(getSelectedConversationKey);
  const isPublic = useSelector(getSelectedConversationIsPublic);
  const dispatch = useDispatch();

  const { i18n } = window;

  function onCloseOverlay() {
    dispatch(resetSelectedMessageIds());
  }

  function onDeleteSelectedMessages() {
    if (selectedConversationKey) {
      void deleteMessagesById(selectedMessageIds, selectedConversationKey);
    }
  }
  function onDeleteSelectedMessagesForEveryone() {
    if (selectedConversationKey) {
      void deleteMessagesByIdForEveryone(selectedMessageIds, selectedConversationKey);
    }
  }

  const isOnlyServerDeletable = isPublic;
  const deleteMessageButtonText = i18n('delete');
  const deleteForEveryoneMessageButtonText = i18n('deleteForEveryone');

  return (
    <div className="message-selection-overlay">
      <div className="close-button">
        <SessionIconButton iconType="exit" iconSize="medium" onClick={onCloseOverlay} />
      </div>

      <div className="button-group">
        {!isOnlyServerDeletable && (
          <SessionButton
            buttonColor={SessionButtonColor.Danger}
            buttonShape={SessionButtonShape.Square}
            buttonType={SessionButtonType.Solid}
            text={deleteMessageButtonText}
            onClick={onDeleteSelectedMessages}
          />
        )}
        <SessionButton
          buttonColor={SessionButtonColor.Danger}
          buttonShape={SessionButtonShape.Square}
          buttonType={SessionButtonType.Solid}
          text={deleteForEveryoneMessageButtonText}
          onClick={onDeleteSelectedMessagesForEveryone}
        />
      </div>
    </div>
  );
};

const GearButton = () => {
  const dispatch = useDispatch();
  const isOverlayShown = useSelector(isRightOverlayShown);

  const onClick = () => {
    if (isOverlayShown) {
      dispatch(resetRightOverlayMode());
    } else {
      dispatch(setRightOverlayMode({ type: 'default', params: null }));
    }
  };

  return (
    <SessionIconButton
      iconType="gear"
      iconSize="medium"
      onClick={onClick}
      data-testid="gear-conversation-options"
    />
  );
};

const CallButton = () => {
  const isPrivate = useSelector(getIsSelectedPrivate);
  const isBlocked = useSelector(getIsSelectedBlocked);
  const activeAt = useSelector(getIsSelectedActive);
  const isMe = useSelector(getIsSelectedNoteToSelf);
  const selectedConvoKey = useSelector(getSelectedConversationKey);

  const hasIncomingCall = useSelector(getHasIncomingCall);
  const hasOngoingCall = useSelector(getHasOngoingCall);
  const canCall = !(hasIncomingCall || hasOngoingCall);

  const isRequest = useIsRequest(selectedConvoKey);

  if (!isPrivate || isMe || !selectedConvoKey || isBlocked || !activeAt || isRequest) {
    return null;
  }

  return (
    <SessionIconButton
      iconType="phone"
      iconSize="large"
      iconPadding="2px"
      margin="0 10px 0 0"
      onClick={() => {
        void callRecipient(selectedConvoKey, canCall);
      }}
    />
  );
};

export const StyledSubtitleContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  span:last-child {
    margin-bottom: 0;
  }
`;

export type ConversationHeaderTitleProps = {
  conversationKey: string;
  isMe: boolean;
  isGroup: boolean;
  isPublic: boolean;
  members: Array<any>;
  subscriberCount?: number;
  isKickedFromGroup: boolean;
  currentNotificationSetting?: ConversationNotificationSettingType;
};

/**
 * The subtitle beneath a conversation title when looking at a conversation screen.
 * @param props props for subtitle. Text to be displayed
 * @returns JSX Element of the subtitle of conversation header
 */
export const ConversationHeaderSubtitle = (props: { text?: string | null }): JSX.Element | null => {
  const { text } = props;
  if (!text) {
    return null;
  }
  return <span className="module-conversation-header__title-text">{text}</span>;
};

const ConversationHeaderTitle = () => {
  const headerTitleProps = useSelector(getConversationHeaderTitleProps);
  const notificationSetting = useSelector(getCurrentNotificationSettingText);
  const isRightPanelOn = useSelector(getRightOverlayMode);

  const convoName = useConversationUsername(headerTitleProps?.conversationKey);
  const dispatch = useDispatch();
  if (!headerTitleProps) {
    return null;
  }

  const { isGroup, isPublic, members, subscriberCount, isMe, isKickedFromGroup } = headerTitleProps;

  const { i18n } = window;

  if (isMe) {
    return <div className="module-conversation-header__title">{i18n('noteToSelf')}</div>;
  }

  let memberCount = 0;
  if (isGroup) {
    if (isPublic) {
      memberCount = subscriberCount || 0;
    } else {
      memberCount = members.length;
    }
  }

  let memberCountText = '';
  if (isGroup && memberCount > 0 && !isKickedFromGroup) {
    const count = String(memberCount);
    memberCountText = isPublic ? i18n('activeMembers', [count]) : i18n('members', [count]);
  }

  const notificationSubtitle = notificationSetting
    ? window.i18n('notificationSubtitle', [notificationSetting])
    : null;
  const fullTextSubtitle = memberCountText
    ? `${memberCountText} ● ${notificationSubtitle}`
    : `${notificationSubtitle}`;

  return (
    <div
      className="module-conversation-header__title"
      onClick={() => {
        if (isRightPanelOn) {
          dispatch(resetRightOverlayMode());
        } else {
          dispatch(setRightOverlayMode({ type: 'default', params: null }));
        }
      }}
      role="button"
    >
      <span className="module-contact-name__profile-name" data-testid="header-conversation-name">
        {convoName}
      </span>
      <StyledSubtitleContainer>
        <ConversationHeaderSubtitle text={fullTextSubtitle} />
      </StyledSubtitleContainer>
    </div>
  );
};

export const ConversationHeaderWithDetails = () => {
  const isSelectionMode = useSelector(isMessageSelectionMode);
  const selectedConvoKey = useSelector(getSelectedConversationKey);

  if (!selectedConvoKey) {
    return null;
  }

  // const isKickedFromGroup = useIsKickedFromGroup(selectedConvoKey);
  // const expireTimerSetting = useExpireTimer(selectedConvoKey);
  // const expirationSettingName = expireTimerSetting
  //   ? ExpirationTimerOptions.getName(expireTimerSetting || 0)
  //   : undefined;

  return (
    <div className="module-conversation-header">
      <div className="conversation-header--items-wrapper">
        <div className="module-conversation-header__title-container">
          <div className="module-conversation-header__title-flex">
            <ConversationHeaderTitle />
          </div>
        </div>

        {!isSelectionMode && (
          <Flex
            container={true}
            flexDirection="row"
            alignItems="center"
            flexGrow={0}
            flexShrink={0}
          >
            {/* {!isKickedFromGroup && (
              <ExpirationLength expirationSettingName={expirationSettingName} />
            )} */}
            <CallButton />
          </Flex>
        )}
        <GearButton />
      </div>

      {isSelectionMode && <SelectionOverlay />}
    </div>
  );
};
