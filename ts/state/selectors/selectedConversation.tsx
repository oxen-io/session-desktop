import { useSelector } from 'react-redux';
import {
  ConversationNotificationSettingType,
  ConversationTypeEnum,
  isOpenOrClosedGroup,
} from '../../models/conversationAttributes';
import { ReduxConversationType } from '../ducks/conversations';
import { StateType } from '../reducer';

const getSelectedConversationKey = (state: StateType): string | undefined => {
  return state.conversations.selectedConversation;
};

const getSelectedConversation = (state: StateType): ReduxConversationType | undefined => {
  const selectedConvo = getSelectedConversationKey(state);
  return selectedConvo ? state.conversations.conversationLookup[selectedConvo] : undefined;
};

/**
 * Returns true if the current conversation selected is a group conversation.
 * Returns false if the current conversation selected is not a group conversation, or none are selected
 */
const isClosedOrOpenGroup = (state: StateType): boolean => {
  const selectedConvo = getSelectedConversation(state);

  const type = selectedConvo?.type;
  return type ? isOpenOrClosedGroup(type) : false;
};

/**
 * Returns true if the current conversation selected is a closed group and false otherwise.
 */
const isClosedGroup = (state: StateType): boolean => {
  const selectedConvo = getSelectedConversation(state);

  return (
    selectedConvo?.type === ConversationTypeEnum.CLOSED_GROUP_LEGACY ||
    selectedConvo?.type === ConversationTypeEnum.CLOSED_GROUP_V3 ||
    false
  );
};

/**
 * Returns true if the current conversation selected is a public group and false otherwise.
 */
const isPublicGroup = (state: StateType): boolean => {
  const selectedConvo = getSelectedConversation(state);

  return selectedConvo?.type === ConversationTypeEnum.OPEN_GROUP || false;
};

const getNotificationOfSelectedConversation = (state: StateType) => {
  const selectedConvo = getSelectedConversation(state);
  if (!selectedConvo) {
    return undefined;
  }
  return selectedConvo.currentNotificationSetting as ConversationNotificationSettingType;
};

/**
 * Returns the formatted text for notification setting.
 */
const getCurrentNotificationSettingText = (state: StateType): string | undefined => {
  const selectedConvo = getSelectedConversation(state);

  if (!selectedConvo) {
    return undefined;
  }
  switch (selectedConvo.currentNotificationSetting) {
    case 'mentions_only':
      return window.i18n('notificationForConvo_mentions_only');
    case 'disabled':
      return window.i18n('notificationForConvo_disabled');
    case 'all':
    default:
      return window.i18n('notificationForConvo_all');
  }
};

const getIsSelectedPrivate = (state: StateType): boolean => {
  return getSelectedConversation(state)?.isPrivate || false;
};

const getMembers = (state: StateType) => {
  return getSelectedConversation(state)?.members || [];
};

const getIsSelectedBlocked = (state: StateType): boolean => {
  return getSelectedConversation(state)?.isBlocked || false;
};
/**
 * Returns true if the currently selected conversation is active (has an active_at field > 0)
 */
const getIsSelectedActive = (state: StateType): boolean => {
  const selectedConvo = getSelectedConversation(state);
  return Boolean(selectedConvo?.activeAt);
};

const getIsSelectedNoteToSelf = (state: StateType): boolean => {
  return getSelectedConversation(state)?.isMe || false;
};

const getSelectedSubscriberCount = (state: StateType): number | undefined => {
  return getSelectedConversation(state)?.subscriberCount;
};

const getSelectedIsKickedFromGroup = (state: StateType): boolean => {
  return getSelectedConversation(state)?.isKickedFromGroup || false;
};

const getSelectedIsLeft = (state: StateType): boolean => {
  return getSelectedConversation(state)?.left || false;
};

const getSelectedWeAreAdmin = (state: StateType): boolean => {
  return getSelectedConversation(state)?.weAreAdmin || false;
};

const getSelectedDisplayNameInProfile = (state: StateType): string | undefined => {
  return getSelectedConversation(state)?.displayNameInProfile;
};

const getSelectedNickname = (state: StateType): string | undefined => {
  return getSelectedConversation(state)?.nickname;
};

const hasSelectedConversationIncomingMessages = (state: StateType): boolean => {
  const { messages } = state.conversations;
  if (messages.length === 0) {
    return false;
  }
  return messages.some(m => m.propsForMessage.direction === 'incoming');
};

const getIsTypingEnabled = (state: StateType): boolean => {
  const selectedConvo = getSelectedConversation(state);
  if (!selectedConvo) {
    return false;
  }
  const { isBlocked, isKickedFromGroup, left, isPublic, writeCapability } = selectedConvo;

  return !(isBlocked || isKickedFromGroup || left || (isPublic && !writeCapability));
};

function hasMessages(state: StateType): boolean {
  return Boolean(state.conversations.messages?.length);
}

function getIsSelectedConvoInitialLoadingInProgress(state: StateType): boolean {
  return Boolean(getSelectedConversation(state)?.isInitialFetchingInProgress);
}

/**
 * Those should not be used except for class components leftovers.
 * Ideally we want to get rid of all of them, so don't add anything here unless it is for the use inside a class component
 */
export const selectedConversationSelectors = {
  getSelectedConversation,
  getSelectedConversationKey,
  hasMessages,
  getIsSelectedConvoInitialLoadingInProgress,
  getIsTypingEnabled,
  isPublicGroup,
};

/**
 * Hooks associated to those selectors.
 * To clean up the code, we want to remove as much of the useSelector call and replace them with their meaningful hook associated.
 * i.e. useSelector(getSelectedConversationKey) => useSelectedConversationKey()
 */

export function useSelectedConversationKey() {
  return useSelector(getSelectedConversationKey);
}

export function useSelectedIsPrivate() {
  return useSelector(getIsSelectedPrivate);
}

export function useSelectedIsPublic() {
  return useSelector(isPublicGroup);
}

export function useSelectedIsOpenOrClosedGroup() {
  return useSelector(isClosedOrOpenGroup);
}

export function useSelectedIsBlocked() {
  return useSelector(getIsSelectedBlocked);
}
export function useSelectedIsActive() {
  return useSelector(getIsSelectedActive);
}

export function useSelectedIsNoteToSelf() {
  return useSelector(getIsSelectedNoteToSelf);
}

export function useSelectedSubsbriberCount() {
  return useSelector(getSelectedSubscriberCount);
}

export function useSelectedIsKickedFromGroup() {
  return useSelector(getSelectedIsKickedFromGroup);
}

export function useSelectedIsLeft() {
  return useSelector(getSelectedIsLeft);
}

export function useSelectedWeAreAdmin() {
  return useSelector(getSelectedWeAreAdmin);
}
export function useSelectedDisplayNameInProfile() {
  return useSelector(getSelectedDisplayNameInProfile);
}

export function useSelectedNickname() {
  return useSelector(getSelectedNickname);
}

/**
 * This returns the setting itself, not the localized value
 */
export function useSelectedNotificationSetting() {
  return useSelector(getNotificationOfSelectedConversation);
}

/**
 * This returns the localizaed string for the corresponding setting
 */
export function useSelectedNotificationSettingText() {
  return useSelector(getCurrentNotificationSettingText);
}

export function useSelectedTypingEnabled() {
  return useSelector(getIsTypingEnabled);
}

export function useSelectedIsClosedGroup() {
  return useSelector(isClosedGroup);
}

export function useSelectedMembers(): Array<string> {
  return useSelector(getMembers);
}

export function useSelectedHasIncomingMessages(): boolean {
  return useSelector(hasSelectedConversationIncomingMessages);
}
