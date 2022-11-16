import { createSelector } from '@reduxjs/toolkit';

import { StateType } from '../reducer';
import {
  ConversationLookupType,
  ConversationsStateType,
  MentionsMembersType,
  ReduxConversationType,
} from '../ducks/conversations';

import { getIntl } from './user';
import { BlockedNumberController } from '../../util';
import { ConversationModel } from '../../models/conversation';
import { LocalizerType } from '../../types/Util';
import { ReplyingToMessageProps } from '../../components/conversation/composition/CompositionBox';

import { LightBoxOptions } from '../../components/conversation/SessionConversation';
import { UserUtils } from '../../session/utils';
import { Storage } from '../../util/storage';
import { ConversationTypeEnum, isOpenOrClosedGroup } from '../../models/conversationAttributes';

import { filter, sortBy } from 'lodash';
import { selectedConversationSelectors } from './selectedConversation';

export const getConversations = (state: StateType): ConversationsStateType => state.conversations;

export const getConversationLookup = createSelector(
  getConversations,
  (state: ConversationsStateType): ConversationLookupType => {
    return state.conversationLookup;
  }
);

export const getConversationsCount = createSelector(getConversationLookup, (state): number => {
  return Object.values(state).length;
});

export const getOurPrimaryConversation = createSelector(
  getConversations,
  (state: ConversationsStateType): ReduxConversationType =>
    state.conversationLookup[Storage.get('primaryDevicePubKey') as string]
);

export const getFirstUnreadMessageId = createSelector(
  getConversations,
  (state: ConversationsStateType): string | undefined => {
    return state.firstUnreadMessageId;
  }
);

export const getConversationHasUnread = createSelector(getFirstUnreadMessageId, unreadId => {
  return Boolean(unreadId);
});

export type MessagePropsType =
  | 'group-notification'
  | 'group-invitation'
  | 'data-extraction'
  | 'message-request-response'
  | 'timer-notification'
  | 'regular-message'
  | 'unread-indicator'
  | 'call-notification';

function getConversationTitle(
  conversation: ReduxConversationType,
  testingi18n?: LocalizerType
): string {
  if (conversation.displayNameInProfile) {
    return conversation.displayNameInProfile;
  }

  if (isOpenOrClosedGroup(conversation.type)) {
    return (testingi18n || window.i18n)('unknown');
  }
  return conversation.id;
}

const collator = new Intl.Collator();

export const _getConversationComparator = (testingi18n?: LocalizerType) => {
  return (left: ReduxConversationType, right: ReduxConversationType): number => {
    // Pin is the first criteria to check
    if (left.isPinned && !right.isPinned) {
      return -1;
    }
    if (!left.isPinned && right.isPinned) {
      return 1;
    }
    // Then if none is pinned, check other criteria
    const leftActiveAt = left.activeAt;
    const rightActiveAt = right.activeAt;
    if (leftActiveAt && !rightActiveAt) {
      return -1;
    }
    if (rightActiveAt && !leftActiveAt) {
      return 1;
    }
    if (leftActiveAt && rightActiveAt && leftActiveAt !== rightActiveAt) {
      return rightActiveAt - leftActiveAt;
    }
    const leftTitle = getConversationTitle(left, testingi18n).toLowerCase();
    const rightTitle = getConversationTitle(right, testingi18n).toLowerCase();

    return collator.compare(leftTitle, rightTitle);
  };
};

export const getConversationComparator = createSelector(getIntl, _getConversationComparator);

// export only because we use it in some of our tests
// tslint:disable-next-line: cyclomatic-complexity
export const _getLeftPaneLists = (
  sortedConversations: Array<ReduxConversationType>
): {
  conversations: Array<ReduxConversationType>;
  contacts: Array<ReduxConversationType>;
  unreadCount: number;
} => {
  const conversations: Array<ReduxConversationType> = [];
  const directConversations: Array<ReduxConversationType> = [];

  let unreadCount = 0;
  for (const conversation of sortedConversations) {
    if (
      conversation.activeAt !== undefined &&
      conversation.type === ConversationTypeEnum.PRIVATE &&
      conversation.isApproved &&
      !conversation.isBlocked
    ) {
      directConversations.push(conversation);
    }

    if (!conversation.isApproved && conversation.isPrivate) {
      // dont increase unread counter, don't push to convo list.
      continue;
    }

    if (conversation.isBlocked) {
      continue;
    }

    if (
      unreadCount < 100 &&
      conversation.unreadCount &&
      conversation.unreadCount > 0 &&
      conversation.currentNotificationSetting !== 'disabled'
    ) {
      unreadCount += conversation.unreadCount;
    }

    conversations.push(conversation);
  }

  return {
    conversations,
    contacts: directConversations,
    unreadCount,
  };
};

export const _getSortedConversations = (
  lookup: ConversationLookupType,
  comparator: (left: ReduxConversationType, right: ReduxConversationType) => number,
  selectedConversation?: string
): Array<ReduxConversationType> => {
  const values = Object.values(lookup);
  const sorted = values.sort(comparator);

  const sortedConversations: Array<ReduxConversationType> = [];

  for (let conversation of sorted) {
    if (selectedConversation === conversation.id) {
      conversation = {
        ...conversation,
        isSelected: true,
      };
    }

    const isBlocked =
      BlockedNumberController.isBlocked(conversation.id) ||
      BlockedNumberController.isGroupBlocked(conversation.id);

    if (isBlocked) {
      conversation = {
        ...conversation,
        isBlocked: true,
      };
    }

    // Remove all invalid conversations and conversatons of devices associated
    //  with cancelled attempted links
    if (!conversation.isPublic && !conversation.activeAt) {
      continue;
    }

    sortedConversations.push(conversation);
  }

  return sortedConversations;
};

const getSortedConversations = createSelector(
  getConversationLookup,
  getConversationComparator,
  selectedConversationSelectors.getSelectedConversationKey,
  _getSortedConversations
);

/**
 *
 * @param sortedConversations List of conversations that are valid for both requests and regular conversation inbox
 * @returns A list of message request conversations.
 */
const _getConversationRequests = (
  sortedConversations: Array<ReduxConversationType>
): Array<ReduxConversationType> => {
  return filter(sortedConversations, conversation => {
    const { isApproved, isBlocked, isPrivate, isMe, activeAt } = conversation;
    const isRequest = ConversationModel.hasValidIncomingRequestValues({
      isApproved,
      isBlocked,
      isPrivate,
      isMe,
      activeAt,
    });
    return isRequest;
  });
};

export const getConversationRequests = createSelector(
  getSortedConversations,
  _getConversationRequests
);

const _getUnreadConversationRequests = (
  sortedConversationRequests: Array<ReduxConversationType>
): Array<ReduxConversationType> => {
  return filter(sortedConversationRequests, conversation => {
    return conversation && conversation.unreadCount && conversation.unreadCount > 0;
  });
};

export const getUnreadConversationRequests = createSelector(
  getConversationRequests,
  _getUnreadConversationRequests
);

const _getPrivateContactsPubkeys = (
  sortedConversations: Array<ReduxConversationType>
): Array<string> => {
  return filter(sortedConversations, conversation => {
    return (
      conversation.isPrivate &&
      !conversation.isBlocked &&
      !conversation.isMe &&
      conversation.didApproveMe &&
      conversation.isApproved &&
      Boolean(conversation.activeAt)
    );
  }).map(convo => convo.id);
};

/**
 * Returns all the conversation ids of private conversations which are
 * - private
 * - not me
 * - not blocked
 * - approved (or message requests are disabled)
 * - active_at is set to something truthy
 */
export const getPrivateContactsPubkeys = createSelector(
  getSortedConversations,
  _getPrivateContactsPubkeys
);

export const getLeftPaneLists = createSelector(getSortedConversations, _getLeftPaneLists);

export const getDirectContacts = createSelector(
  getLeftPaneLists,
  (state: {
    conversations: Array<ReduxConversationType>;
    contacts: Array<ReduxConversationType>;
    unreadCount: number;
  }) => state.contacts
);

export const getDirectContactsCount = createSelector(
  getDirectContacts,
  (contacts: Array<ReduxConversationType>) => contacts.length
);

export type DirectContactsByNameType = {
  displayName?: string;
  id: string;
};

// make sure that createSelector is called here so this function is memoized
export const getDirectContactsByName = createSelector(
  getDirectContacts,
  (contacts: Array<ReduxConversationType>): Array<DirectContactsByNameType> => {
    const extractedContacts = contacts
      .filter(m => m.id !== UserUtils.getOurPubKeyStrFromCache())
      .map(m => {
        return {
          id: m.id,
          displayName: m.nickname || m.displayNameInProfile,
        };
      });
    const extractedContactsNoDisplayName = sortBy(
      extractedContacts.filter(m => !m.displayName),
      'id'
    );
    const extractedContactsWithDisplayName = sortBy(
      extractedContacts.filter(m => Boolean(m.displayName)),
      'displayName'
    );

    return [...extractedContactsWithDisplayName, ...extractedContactsNoDisplayName];
  }
);

export const getUnreadMessageCount = createSelector(getLeftPaneLists, (state): number => {
  return state.unreadCount;
});

export const getNumberOfPinnedConversations = createSelector(getConversations, (state): number => {
  const values = Object.values(state.conversationLookup);
  return values.filter(conversation => conversation.isPinned).length;
});

export const isMessageSelectionMode = (state: StateType): boolean =>
  Boolean(state.conversations.selectedMessageIds.length > 0);

export const getSelectedMessageIds = createSelector(
  getConversations,
  (state: ConversationsStateType): Array<string> => state.selectedMessageIds
);

export const getIsMessageSelectionMode = createSelector(
  getSelectedMessageIds,
  (state: Array<string>): boolean => Boolean(state.length)
);

export const getLightBoxOptions = createSelector(
  getConversations,
  (state: ConversationsStateType): LightBoxOptions | undefined => state.lightBox
);

export const getQuotedMessage = createSelector(
  getConversations,
  (state: ConversationsStateType): ReplyingToMessageProps | undefined => state.quotedMessage
);

export const areMoreMessagesBeingFetched = createSelector(
  getConversations,
  (state: ConversationsStateType): boolean => state.areMoreMessagesBeingFetched || false
);

export const getShowScrollButton = createSelector(
  getConversations,
  (state: ConversationsStateType): boolean => state.showScrollButton || false
);

export const getQuotedMessageToAnimate = createSelector(
  getConversations,
  (state: ConversationsStateType): string | undefined => state.animateQuotedMessageId || undefined
);

export const getShouldHighlightMessage = createSelector(
  getConversations,
  (state: ConversationsStateType): boolean =>
    Boolean(state.animateQuotedMessageId && state.shouldHighlightMessage)
);

export const getNextMessageToPlayId = createSelector(
  getConversations,
  (state: ConversationsStateType): string | undefined => state.nextMessageToPlayId || undefined
);

export const getMentionsInput = (state: StateType): MentionsMembersType =>
  state.conversations.mentionMembers;

/**
 * This returns the most recent message id in the database. This is not the most recent message shown,
 * but the most recent one, which could still not be loaded.
 */
export const getMostRecentMessageId = (state: StateType): string | null => {
  return state.conversations.mostRecentMessageId;
};

export const getOldTopMessageId = createSelector(
  getConversations,
  (state: ConversationsStateType): string | null => state.oldTopMessageId || null
);

export const getOldBottomMessageId = createSelector(
  getConversations,
  (state: ConversationsStateType): string | null => state.oldBottomMessageId || null
);
