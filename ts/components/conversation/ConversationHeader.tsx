import React from 'react';

import { Avatar, AvatarSize } from '../avatar/Avatar';

import { contextMenu } from 'react-contexify';
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
  isMessageDetailView,
  isMessageSelectionMode,
  isRightPanelShowing,
} from '../../state/selectors/conversations';
import { useDispatch, useSelector } from 'react-redux';

import {
  deleteMessagesById,
  deleteMessagesByIdForEveryone,
} from '../../interactions/conversations/unsendingInteractions';
import {
  closeMessageDetailsView,
  closeRightPanel,
  openRightPanel,
  resetSelectedMessageIds,
} from '../../state/ducks/conversations';
import { callRecipient } from '../../interactions/conversationInteractions';
import { getHasIncomingCall, getHasOngoingCall } from '../../state/selectors/call';
import {
  useConversationUsername,
  useExpireTimer,
  useIsIncomingRequest,
  useIsKickedFromGroup,
  useIsOutgoingRequest,
} from '../../hooks/useParamSelector';
import {
  SessionButton,
  SessionButtonColor,
  SessionButtonShape,
  SessionButtonType,
} from '../basic/SessionButton';
import { SessionIconButton } from '../icon';
import { ConversationHeaderMenu } from '../menu/ConversationHeaderMenu';
import { Flex } from '../basic/Flex';
import { ExpirationTimerOptions } from '../../util/expiringMessages';

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

const TripleDotContainer = styled.button`
  user-select: none;
  flex-grow: 0;
  flex-shrink: 0;
`;

const TripleDotsMenu = (props: { triggerId: string; showBackButton: boolean }) => {
  const { showBackButton } = props;
  const selectedConvoKey = useSelector(getSelectedConversationKey);
  const isOutgoingRequest = useIsOutgoingRequest(selectedConvoKey);
  const isIncomingRequest = useIsIncomingRequest(selectedConvoKey);

  if (showBackButton || isOutgoingRequest || isIncomingRequest) {
    return null;
  }
  return (
    <TripleDotContainer
      onClick={(e: any) => {
        contextMenu.show({
          id: props.triggerId,
          event: e,
        });
      }}
      data-testid="three-dots-conversation-options"
    >
      <SessionIconButton iconType="ellipses" iconSize="medium" />
    </TripleDotContainer>
  );
};

const ExpirationLength = (props: { expirationSettingName?: string }) => {
  const { expirationSettingName } = props;

  if (!expirationSettingName) {
    return null;
  }

  return (
    <div className="module-conversation-header__expiration">
      <div className="module-conversation-header__expiration__clock-icon" />
      <div
        className="module-conversation-header__expiration__setting"
        data-testid="disappearing-messages-indicator"
      >
        {expirationSettingName}
      </div>
    </div>
  );
};

const AvatarHeader = () => {
  const selectedConvoKey = useSelector(getSelectedConversationKey);

  const isIncomingRequest = useIsIncomingRequest(selectedConvoKey);
  const isOutgoingRequest = useIsIncomingRequest(selectedConvoKey);

  const isMessageDetailOpened = useSelector(isMessageDetailView);
  const dispatch = useDispatch();

  if (!selectedConvoKey) {
    return null;
  }

  const avatarClick =
    isIncomingRequest || isOutgoingRequest
      ? undefined
      : () => {
          // do not allow right panel to appear if another button is shown on the SessionConversation
          if (!isMessageDetailOpened) {
            dispatch(openRightPanel());
          }
        };

  return (
    <span className="module-conversation-header__avatar">
      <Avatar
        size={AvatarSize.S}
        onAvatarClick={avatarClick}
        pubkey={selectedConvoKey}
        dataTestId="conversation-options-avatar"
      />
    </span>
  );
};

const BackButton = (props: { onGoBack: () => void; showBackButton: boolean }) => {
  const { onGoBack, showBackButton } = props;
  if (!showBackButton) {
    return null;
  }

  return (
    <SessionIconButton
      iconType="chevron"
      iconSize="large"
      iconRotation={90}
      onClick={onGoBack}
      dataTestId="back-button-message-details"
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

  // we do not want to show the call button if we are not fully approved with this convo (message request accepted)
  const isIncomingRequest = useIsIncomingRequest(selectedConvoKey);
  const isOutgoingRequest = useIsOutgoingRequest(selectedConvoKey);

  if (
    !isPrivate ||
    isMe ||
    !selectedConvoKey ||
    isBlocked ||
    !activeAt ||
    isIncomingRequest ||
    isOutgoingRequest
  ) {
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

const StyledTitleContainer = styled.div`
  margin-inline: 100px;
  display: flex;
  font-size: 17px;
  flex-direction: column;
  min-width: 0;
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  align-items: center;
  -webkit-user-select: text;
  cursor: pointer;
  pointer-events: all;

  .module-contact-name__profile-name {
    width: 100%;
    overflow: hidden !important;
    text-overflow: ellipsis;
  }
  .module-contact-name {
    width: 100%;
  }
  .module-contact-name__profile-number {
    text-align: center;
  }
`;

const StyledSubtitle = styled.span`
  color: var(--color-text);
  font-weight: 400;
  font-size: var(--font-size-sm);
  line-height: var(--font-size-sm);
`;

const StyledItemsWrapper = styled.div`
  display: flex;
  flex-grow: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  justify-content: space-between;
`;

const StyledHeaderTitleContainer = styled.div`
  position: absolute;
  top: 0;
  justify-content: center;
  z-index: 3;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  text-align: center;
  flex-grow: 1;
  pointer-events: none;
`;

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
  return <StyledSubtitle>{text}</StyledSubtitle>;
};

const ConversationHeaderTitle = () => {
  const headerTitleProps = useSelector(getConversationHeaderTitleProps);
  const notificationSetting = useSelector(getCurrentNotificationSettingText);
  const isRightPanelOn = useSelector(isRightPanelShowing);
  const isIncomingRequest = useIsIncomingRequest(headerTitleProps?.conversationKey);
  const isOutgoingRequest = useIsIncomingRequest(headerTitleProps?.conversationKey);

  const convoName = useConversationUsername(headerTitleProps?.conversationKey);
  const dispatch = useDispatch();
  if (!headerTitleProps) {
    return null;
  }

  const { isGroup, isPublic, members, subscriberCount, isMe, isKickedFromGroup } = headerTitleProps;

  const { i18n } = window;

  if (isMe) {
    return <StyledTitleContainer>{i18n('noteToSelf')}</StyledTitleContainer>;
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
    memberCountText = i18n('members', [count]);
  }

  const notificationSubtitle = notificationSetting
    ? window.i18n('notificationSubtitle', [notificationSetting])
    : null;
  const fullTextSubtitle = memberCountText
    ? `${memberCountText} ● ${notificationSubtitle}`
    : `${notificationSubtitle}`;

  return (
    <StyledTitleContainer
      onClick={() => {
        if (isRightPanelOn || isIncomingRequest || isOutgoingRequest) {
          dispatch(closeRightPanel());
        } else {
          dispatch(openRightPanel());
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
    </StyledTitleContainer>
  );
};

export const ConversationHeaderWithDetails = () => {
  const isSelectionMode = useSelector(isMessageSelectionMode);
  const isMessageDetailOpened = useSelector(isMessageDetailView);
  const selectedConvoKey = useSelector(getSelectedConversationKey);
  const dispatch = useDispatch();

  if (!selectedConvoKey) {
    return null;
  }

  const isKickedFromGroup = useIsKickedFromGroup(selectedConvoKey);
  const expireTimerSetting = useExpireTimer(selectedConvoKey);
  const expirationSettingName = expireTimerSetting
    ? ExpirationTimerOptions.getName(expireTimerSetting || 0)
    : undefined;

  const triggerId = 'conversation-header';

  return (
    <>
      <div className="module-conversation-header">
        <StyledItemsWrapper>
          <BackButton
            onGoBack={() => {
              dispatch(closeMessageDetailsView());
            }}
            showBackButton={isMessageDetailOpened}
          />
          <TripleDotsMenu triggerId={triggerId} showBackButton={isMessageDetailOpened} />

          {!isSelectionMode && (
            <Flex
              container={true}
              flexDirection="row"
              alignItems="center"
              flexGrow={0}
              flexShrink={0}
              margin="0 0 0 auto"
            >
              {!isKickedFromGroup && (
                <ExpirationLength expirationSettingName={expirationSettingName} />
              )}
              <CallButton />
              <AvatarHeader />
            </Flex>
          )}

          <ConversationHeaderMenu triggerId={triggerId} />
        </StyledItemsWrapper>
        {isSelectionMode && <SelectionOverlay />}
      </div>
      <StyledHeaderTitleContainer>
        <ConversationHeaderTitle />
      </StyledHeaderTitleContainer>
    </>
  );
};
