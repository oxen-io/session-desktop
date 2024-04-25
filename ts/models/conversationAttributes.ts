import { defaults } from 'lodash';
import {
  ConversationTypeEnum,
  ConversationAttributes,
  CONVERSATION_PRIORITIES,
  ConversationNotificationSettingType,
} from './conversationTypes';

export function isOpenOrClosedGroup(conversationType: ConversationTypeEnum) {
  return (
    conversationType === ConversationTypeEnum.GROUP ||
    conversationType === ConversationTypeEnum.GROUPV3
  );
}

export function isDirectConversation(conversationType: ConversationTypeEnum) {
  return conversationType === ConversationTypeEnum.PRIVATE;
}

/**
 * This function mutates optAttributes
 * @param optAttributes the entry object attributes to set the defaults to.
 *
 * Test are in ConversationModels_test.ts
 */
export const fillConvoAttributesWithDefaults = (
  optAttributes: ConversationAttributes
): ConversationAttributes => {
  return defaults(optAttributes, {
    members: [],
    zombies: [],
    groupAdmins: [],

    lastJoinedTimestamp: 0,
    expirationMode: 'off',
    expireTimer: 0,

    active_at: 0,

    lastMessage: null,
    lastMessageStatus: undefined,
    lastMessageInteractionType: null,
    lastMessageInteractionStatus: null,

    triggerNotificationsFor: 'all', // if the settings is not set in the db, this is the default

    isTrustedForAttachmentDownload: false, // we don't trust a contact until we say so
    isApproved: false,
    didApproveMe: false,
    isKickedFromGroup: false,
    left: false,
    priority: CONVERSATION_PRIORITIES.default,
    markedAsUnread: false,
    blocksSogsMsgReqsTimestamp: 0,
  });
};

/**
 * all: all  notifications enabled, the default
 * disabled: no notifications at all
 * mentions_only: trigger a notification only on mentions of ourself
 */
export const ConversationNotificationSetting: Array<ConversationNotificationSettingType> = [
  'all',
  'disabled',
  'mentions_only',
];
