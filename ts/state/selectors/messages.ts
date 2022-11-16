import { createSelector } from '@reduxjs/toolkit';
import { isEmpty, pick } from 'lodash';
import { useSelector } from 'react-redux';
import { MessageAttachmentSelectorProps } from '../../components/conversation/message/message-content/MessageAttachment';
import { MessageAuthorSelectorProps } from '../../components/conversation/message/message-content/MessageAuthorText';
import { MessageAvatarSelectorProps } from '../../components/conversation/message/message-content/MessageAvatar';
import { MessageContentSelectorProps } from '../../components/conversation/message/message-content/MessageContent';
import { MessageContentWithStatusSelectorProps } from '../../components/conversation/message/message-content/MessageContentWithStatus';
import { MessageContextMenuSelectorProps } from '../../components/conversation/message/message-content/MessageContextMenu';
import { MessageLinkPreviewSelectorProps } from '../../components/conversation/message/message-content/MessageLinkPreview';
import { MessageQuoteSelectorProps } from '../../components/conversation/message/message-content/MessageQuote';
import { MessageReactsSelectorProps } from '../../components/conversation/message/message-content/MessageReactions';
import { MessageStatusSelectorProps } from '../../components/conversation/message/message-content/MessageStatus';
import { MessageTextSelectorProps } from '../../components/conversation/message/message-content/MessageText';
import { GenericReadableMessageSelectorProps } from '../../components/conversation/message/message-item/GenericReadableMessage';
import { UserUtils } from '../../session/utils';
import {
  ConversationLookupType,
  MessageModelPropsWithConvoProps,
  MessageModelPropsWithoutConvoProps,
  SortedMessageModelProps,
  UnsortedMessageModelPropsWithConvoProps,
} from '../ducks/conversations';
import { StateType } from '../reducer';
import { getSelectedMessageIds } from './conversations';
import { selectedConversationSelectors } from './selectedConversation';

/**
 * I'd say that this selector is not doing anything heavy as defined by redux, so let's not use a memoized selector for it
 */
const getSortedMessagesTypesOfSelectedConversation = (state: StateType) => {
  const sortedMessages = getSortedMessagesOfSelectedConversation(state);
  const firstUnreadId = state.conversations.firstUnreadMessageId;
  const maxMessagesBetweenTwoDateBreaks = 5;
  // we want to show the date break if there is a large jump in time
  // remember that messages are sorted from the most recent to the oldest
  return sortedMessages.map((msg, index) => {
    const isFirstUnread = Boolean(firstUnreadId === msg.propsForMessage.id);
    const messageTimestamp = msg.propsForMessage.serverTimestamp || msg.propsForMessage.timestamp;
    // do not show the date break if we are the oldest message (no previous)
    // this is to smooth a bit the loading of older message (to avoid a jump once new messages are rendered)
    const previousMessageTimestamp =
      index + 1 >= sortedMessages.length
        ? Number.MAX_SAFE_INTEGER
        : sortedMessages[index + 1].propsForMessage.serverTimestamp ||
          sortedMessages[index + 1].propsForMessage.timestamp;

    const showDateBreak =
      messageTimestamp - previousMessageTimestamp > maxMessagesBetweenTwoDateBreaks * 60 * 1000
        ? messageTimestamp
        : undefined;

    const common = { showUnreadIndicator: isFirstUnread, showDateBreak };

    if (msg.propsForDataExtractionNotification) {
      return {
        ...common,
        message: {
          messageType: 'data-extraction',
          props: { ...msg.propsForDataExtractionNotification, messageId: msg.propsForMessage.id },
        },
      };
    }

    if (msg.propsForMessageRequestResponse) {
      return {
        ...common,
        message: {
          messageType: 'message-request-response',
          props: { ...msg.propsForMessageRequestResponse, messageId: msg.propsForMessage.id },
        },
      };
    }

    if (msg.propsForGroupInvitation) {
      return {
        ...common,
        message: {
          messageType: 'group-invitation',
          props: { ...msg.propsForGroupInvitation, messageId: msg.propsForMessage.id },
        },
      };
    }

    if (msg.propsForGroupUpdateMessage) {
      return {
        ...common,
        message: {
          messageType: 'group-notification',
          props: { ...msg.propsForGroupUpdateMessage, messageId: msg.propsForMessage.id },
        },
      };
    }

    if (msg.propsForTimerNotification) {
      return {
        ...common,
        message: {
          messageType: 'timer-notification',
          props: { ...msg.propsForTimerNotification, messageId: msg.propsForMessage.id },
        },
      };
    }

    if (msg.propsForCallNotification) {
      return {
        ...common,
        message: {
          messageType: 'call-notification',
          props: {
            ...msg.propsForCallNotification,
            messageId: msg.propsForMessage.id,
          },
        },
      };
    }

    return {
      showUnreadIndicator: isFirstUnread,
      showDateBreak,
      message: {
        messageType: 'regular-message',
        props: { messageId: msg.propsForMessage.id },
      },
    };
  });
};

export function useSortedMessageWithTypesProps() {
  return useSelector(getSortedMessagesTypesOfSelectedConversation);
}

/// Those calls are just related to ordering messages in the redux store.

function updateFirstMessageOfSeries(
  messageModelsProps: Array<MessageModelPropsWithoutConvoProps>
): Array<SortedMessageModelProps> {
  // messages are got from the more recent to the oldest, so we need to check if
  // the next messages in the list is still the same author.
  // The message is the first of the series if the next message is not from the same author
  const sortedMessageProps: Array<SortedMessageModelProps> = [];

  for (let i = 0; i < messageModelsProps.length; i++) {
    const currentSender = messageModelsProps[i].propsForMessage?.sender;
    // most recent message is at index 0, so the previous message sender is 1+index
    const previousSender =
      i < messageModelsProps.length - 1
        ? messageModelsProps[i + 1].propsForMessage?.sender
        : undefined;
    const nextSender = i > 0 ? messageModelsProps[i - 1].propsForMessage?.sender : undefined;
    // Handle firstMessageOfSeries for conditional avatar rendering

    sortedMessageProps.push({
      ...messageModelsProps[i],
      firstMessageOfSeries: !(i >= 0 && currentSender === previousSender),
      lastMessageOfSeries: currentSender !== nextSender,
    });
  }
  return sortedMessageProps;
}

function sortMessages(
  messages: Array<MessageModelPropsWithoutConvoProps>,
  isPublic: boolean
): Array<MessageModelPropsWithoutConvoProps> {
  // we order by serverTimestamp for public convos
  // be sure to update the sorting order to fetch messages from the DB too at getMessagesByConversation
  if (isPublic) {
    return messages.slice().sort((a, b) => {
      return (b.propsForMessage.serverTimestamp || 0) - (a.propsForMessage.serverTimestamp || 0);
    });
  }
  if (messages.some(n => !n.propsForMessage.timestamp && !n.propsForMessage.receivedAt)) {
    throw new Error('Found some messages without any timestamp set');
  }

  // for non public convos, we order by sent_at or received_at timestamp.
  // we assume that a message has either a sent_at or a received_at field set.
  const messagesSorted = messages
    .slice()
    .sort(
      (a, b) =>
        (b.propsForMessage.timestamp || b.propsForMessage.receivedAt || 0) -
        (a.propsForMessage.timestamp || a.propsForMessage.receivedAt || 0)
    );

  return messagesSorted;
}

// Redux recommends to do filtered and deriving state in a selector rather than ourself. This an expensive resorting so this is a memoize selector
const getSortedMessagesOfSelectedConversation = createSelector(
  getMessagesOfSelectedConversation,
  selectedConversationSelectors.isPublicGroup,
  (
    messages: Array<MessageModelPropsWithoutConvoProps>,
    isPublic: boolean
  ): Array<SortedMessageModelProps> => {
    if (messages.length === 0) {
      return [];
    }

    console.error('getSortedMessagesOfSelectedConversation');

    const sortedMessage = sortMessages(messages, isPublic);
    return updateFirstMessageOfSeries(sortedMessage);
  }
);

export const messagesSelectors = { getSortedMessagesOfSelectedConversation };

export function getIdsOfSortedMessages(state: StateType) {
  const sortedMessages = getSortedMessagesOfSelectedConversation(state);
  if (!sortedMessages.length) {
    return [];
  }
  return sortedMessages.map(m => m.propsForMessage.id);
}

const getOldestMessageId = (state: StateType): string | undefined => {
  const messages = getSortedMessagesOfSelectedConversation(state);
  const oldest = messages.length > 0 ? messages[messages.length - 1].propsForMessage.id : undefined;

  return oldest;
};

export function useOldestMessageId() {
  return useSelector(getOldestMessageId);
}

const getYoungestMessageId = (state: StateType): string | undefined => {
  const messages = getSortedMessagesOfSelectedConversation(state);
  const youngest = messages.length > 0 ? messages[0].propsForMessage.id : undefined;

  return youngest;
};

export function useYoungestMessageId() {
  return useSelector(getYoungestMessageId);
}

function isSortedMessage(
  msg: MessageModelPropsWithoutConvoProps | SortedMessageModelProps
): msg is SortedMessageModelProps {
  return (msg as SortedMessageModelProps).firstMessageOfSeries !== undefined;
}

function fillWithAuthorDetails(
  conversations: ConversationLookupType,
  foundMessageProps?: MessageModelPropsWithoutConvoProps | SortedMessageModelProps
): MessageModelPropsWithConvoProps | UnsortedMessageModelPropsWithConvoProps | undefined {
  if (!foundMessageProps || !foundMessageProps.propsForMessage.convoId) {
    return undefined;
  }
  const sender = foundMessageProps?.propsForMessage?.sender;

  const foundMessageConversation = conversations[foundMessageProps.propsForMessage.convoId];
  if (!foundMessageConversation || !sender) {
    return undefined;
  }

  const foundSenderConversation = conversations[sender];
  if (!foundSenderConversation) {
    return undefined;
  }

  const ourPubkey = UserUtils.getOurPubKeyStrFromCache();
  const isGroup = !foundMessageConversation.isPrivate;
  const isPublic = foundMessageConversation.isPublic;

  const groupAdmins = (isGroup && foundMessageConversation.groupAdmins) || [];
  const weAreAdmin = groupAdmins.includes(ourPubkey) || false;

  const groupModerators = (isGroup && foundMessageConversation.groupModerators) || [];
  const weAreModerator = groupModerators.includes(ourPubkey) || false;
  // A message is deletable if
  // either we sent it,
  // or the convo is not a public one (in this case, we will only be able to delete for us)
  // or the convo is public and we are an admin or moderator
  const isDeletable =
    sender === ourPubkey || !isPublic || (isPublic && (weAreAdmin || weAreModerator));

  // A message is deletable for everyone if
  // either we sent it no matter what the conversation type,
  // or the convo is public and we are an admin or moderator
  const isDeletableForEveryone =
    sender === ourPubkey || (isPublic && (weAreAdmin || weAreModerator)) || false;

  const isSenderAdmin = groupAdmins.includes(sender);
  const senderIsUs = sender === ourPubkey;

  const authorName =
    foundSenderConversation.nickname || foundSenderConversation.displayNameInProfile || null;
  const authorProfileName = senderIsUs
    ? window.i18n('you')
    : foundSenderConversation.nickname ||
      foundSenderConversation.displayNameInProfile ||
      window.i18n('anonymous');

  if (isSortedMessage(foundMessageProps)) {
    const messageProps: MessageModelPropsWithConvoProps = {
      ...foundMessageProps,
      propsForMessage: {
        ...foundMessageProps.propsForMessage,
        isBlocked: !!foundMessageConversation.isBlocked,
        isPublic: !!isPublic,
        isOpenGroupV2: !!isPublic,
        isSenderAdmin,
        isDeletable,
        isDeletableForEveryone,
        weAreAdmin,
        conversationType: foundMessageConversation.type,
        sender,
        authorAvatarPath: foundSenderConversation.avatarPath || null,
        isKickedFromGroup: foundMessageConversation.isKickedFromGroup || false,
        authorProfileName: authorProfileName || 'Unknown',
        authorName,
      },
    };

    return messageProps;
  }
  const messageProps: UnsortedMessageModelPropsWithConvoProps = {
    ...foundMessageProps,
    propsForMessage: {
      ...foundMessageProps.propsForMessage,
      isBlocked: !!foundMessageConversation.isBlocked,
      isPublic: !!isPublic,
      isOpenGroupV2: !!isPublic,
      isSenderAdmin,
      isDeletable,
      isDeletableForEveryone,
      weAreAdmin,
      conversationType: foundMessageConversation.type,
      sender,
      authorAvatarPath: foundSenderConversation.avatarPath || null,
      isKickedFromGroup: foundMessageConversation.isKickedFromGroup || false,
      authorProfileName: authorProfileName || 'Unknown',
      authorName,
    },
  };

  return messageProps;
}

// tslint:disable-next-line: cyclomatic-complexity
const getSortedMessagePropsByMessageId = (
  state: StateType,
  id?: string
): MessageModelPropsWithConvoProps | undefined => {
  if (!id) {
    return undefined;
  }
  const messages = getSortedMessagesOfSelectedConversation(state);
  const conversations = state.conversations.conversationLookup;
  const foundMessageProps: SortedMessageModelProps | undefined = messages?.find(
    m => m?.propsForMessage?.id === id
  );
  return fillWithAuthorDetails(conversations, foundMessageProps) as
    | MessageModelPropsWithConvoProps
    | undefined;
};

// tslint:disable-next-line: cyclomatic-complexity
const getUnsortedMessagePropsByMessageId = (
  state: StateType,
  id?: string
): UnsortedMessageModelPropsWithConvoProps | undefined => {
  if (!id) {
    return undefined;
  }
  const messages = state.conversations.messages;
  const conversations = state.conversations.conversationLookup;
  const foundMessageProps: MessageModelPropsWithoutConvoProps | undefined = messages?.find(
    m => m?.propsForMessage?.id === id
  );

  return fillWithAuthorDetails(conversations, foundMessageProps) as
    | UnsortedMessageModelPropsWithConvoProps
    | undefined;
};

const getMessageAvatarProps = (
  state: StateType,
  messageId?: string
): MessageAvatarSelectorProps | undefined => {
  // for the avatar we do need to know if this the first message of the serie or not. So we use the `Sorted` function
  const props = getSortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return undefined;
  }

  const messageAvatarProps: MessageAvatarSelectorProps = {
    lastMessageOfSeries: props.lastMessageOfSeries,
    ...pick(props.propsForMessage, [
      'authorAvatarPath',
      'authorName',
      'sender',
      'authorProfileName',
      'direction',
      'isSenderAdmin',
    ]),
  };

  return messageAvatarProps;
};

export function useMessageAvatarProps(messageId?: string) {
  return useSelector((state: StateType) => getMessageAvatarProps(state, messageId));
}

const getMessageReactsProps = (
  state: StateType,
  messageId?: string
): MessageReactsSelectorProps | null => {
  if (!messageId) {
    return null;
  }
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return null;
  }
  console.info('getMessageReactsProps break me down');

  const msgProps: MessageReactsSelectorProps = pick(props.propsForMessage, [
    'convoId',
    'conversationType',
    'isPublic',
    'reacts',
    'serverId',
  ]);

  if (msgProps.reacts) {
    // NOTE we don't want to render reactions that have 'senders' as an object this is a deprecated type used during development 25/08/2022
    const oldReactions = Object.values(msgProps.reacts).filter(
      reaction => !Array.isArray(reaction.senders)
    );

    if (oldReactions.length > 0) {
      msgProps.reacts = undefined;
      return msgProps;
    }

    const sortedReacts = Object.entries(msgProps.reacts).sort((a, b) => {
      return a[1].index < b[1].index ? -1 : a[1].index > b[1].index ? 1 : 0;
    });
    msgProps.sortedReacts = sortedReacts;
  }

  return msgProps;
};

export function useMessageReactsProps(messageId?: string) {
  return useSelector((state: StateType) => getMessageReactsProps(state, messageId));
}

const getMessageLinkPreviewProps = (
  state: StateType,
  messageId?: string
): MessageLinkPreviewSelectorProps | undefined => {
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return undefined;
  }

  const msgProps: MessageLinkPreviewSelectorProps = pick(props.propsForMessage, [
    'direction',
    'attachments',
    'previews',
  ]);

  return msgProps;
};

export function useMessageLinkPreviewProps(messageId?: string) {
  return useSelector((state: StateType) => getMessageLinkPreviewProps(state, messageId));
}

const getMessageQuoteProps = (
  state: StateType,
  messageId?: string
): MessageQuoteSelectorProps | undefined => {
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return undefined;
  }

  const msgProps: MessageQuoteSelectorProps = pick(props.propsForMessage, ['direction', 'quote']);

  return msgProps;
};

export function useMessageQuoteProps(messageId?: string) {
  return useSelector((state: StateType) => getMessageQuoteProps(state, messageId));
}

const getMessageStatusProps = (
  state: StateType,
  messageId?: string
): MessageStatusSelectorProps | undefined => {
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return undefined;
  }

  const msgProps: MessageStatusSelectorProps = pick(props.propsForMessage, ['direction', 'status']);

  return msgProps;
};

export function useMessageStatusProps(messageId?: string) {
  return useSelector((state: StateType) => getMessageStatusProps(state, messageId));
}

const getMessageTextProps = (
  state: StateType,
  messageId?: string
): MessageTextSelectorProps | undefined => {
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return undefined;
  }

  const msgProps: MessageTextSelectorProps = pick(props.propsForMessage, [
    'direction',
    'status',
    'text',
    'isDeleted',
    'conversationType',
  ]);

  return msgProps;
};

export function useMessageTextProps(messageId?: string) {
  return useSelector((state: StateType) => getMessageTextProps(state, messageId));
}

const getMessageDetailsProps = (state: StateType, messageId?: string) => {
  if (!messageId) {
    return null;
  }
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return null;
  }

  const msgDetailsProps = pick(props.propsForMessage, [
    'sender',
    'text',
    'receivedAt',
    'timestamp',

    'direction',
    'status',
    'isDeleted',
    'isDeletable',
    'isDeletableForEveryone',
    'receivedAt',

    'conversationType',
    'serverTimestamp',
    'serverId',
    'messageHash',
  ]);
  return msgDetailsProps;
};

export function useMessageDetailsProps(messageId?: string) {
  return useSelector((state: StateType) => {
    if (!messageId) {
      return null;
    }
    const messageDetailsProps = getMessageDetailsProps(state, messageId);
    if (!messageDetailsProps) {
      return null;
    }
    return messageDetailsProps;
  });
}

const getMessageContextMenuProps = (
  state: StateType,
  messageId?: string
): MessageContextMenuSelectorProps | undefined => {
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return undefined;
  }

  const msgProps: MessageContextMenuSelectorProps = pick(props.propsForMessage, [
    'attachments',
    'sender',
    'convoId',
    'direction',
    'status',
    'isDeletable',
    'isPublic',
    'isOpenGroupV2',
    'weAreAdmin',
    'isSenderAdmin',
    'text',
    'serverTimestamp',
    'timestamp',
    'isBlocked',
    'isDeletableForEveryone',
  ]);

  return msgProps;
};

export function useMessageContextMenuProps(messageId?: string) {
  return useSelector((state: StateType) => getMessageContextMenuProps(state, messageId));
}

const getMessageAuthorProps = (
  state: StateType,
  messageId?: string
): MessageAuthorSelectorProps | undefined => {
  const props = getSortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return undefined;
  }

  // console.info('getMessageAuthorProps break me appart');
  const msgProps: MessageAuthorSelectorProps = {
    firstMessageOfSeries: props.firstMessageOfSeries,
    ...pick(props.propsForMessage, ['authorName', 'sender', 'authorProfileName', 'direction']),
  };

  return msgProps;
};

export function useMessageAuthorProps(messageId?: string) {
  return useSelector((state: StateType) => getMessageAuthorProps(state, messageId));
}

const getMessageAttachmentProps = (
  state: StateType,
  messageId?: string
): MessageAttachmentSelectorProps | undefined => {
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return undefined;
  }

  const msgProps: MessageAttachmentSelectorProps = {
    attachments: props.propsForMessage.attachments || [],
    ...pick(props.propsForMessage, [
      'direction',
      'isTrustedForAttachmentDownload',
      'timestamp',
      'serverTimestamp',
      'sender',
      'convoId',
    ]),
  };

  return msgProps;
};

export function useMessageAttachmentProps(messageId?: string) {
  return useSelector((state: StateType) => getMessageAttachmentProps(state, messageId));
}

const getIsMessageSelected = (state: StateType, messageId?: string): boolean => {
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  const selectedIds = getSelectedMessageIds(state);
  if (!props || isEmpty(props)) {
    return false;
  }

  const { id } = props.propsForMessage;

  return selectedIds.includes(id);
};

export function useMessageIsSelected(messageId?: string) {
  return useSelector((state: StateType) => getIsMessageSelected(state, messageId));
}

const getMessageContentSelectorProps = (
  state: StateType,
  messageId?: string
): MessageContentSelectorProps | undefined => {
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return undefined;
  }
  const msgProps: MessageContentSelectorProps = {
    ...pick(props.propsForMessage, [
      'direction',
      'serverTimestamp',
      'text',
      'timestamp',
      'previews',
      'quote',
      'attachments',
    ]),
  };

  return msgProps;
};

export function useMessageContentSelectorProps(messageId?: string) {
  return useSelector((state: StateType) => getMessageContentSelectorProps(state, messageId));
}

const getMessageContentWithStatusesSelectorProps = (
  state: StateType,
  messageId?: string
): MessageContentWithStatusSelectorProps | undefined => {
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return undefined;
  }

  const msgProps: MessageContentWithStatusSelectorProps = {
    ...pick(props.propsForMessage, ['direction', 'isDeleted']),
  };

  return msgProps;
};

export function useMessageContentWithStatusesSelectorProps(messageId?: string) {
  return useSelector((state: StateType) =>
    getMessageContentWithStatusesSelectorProps(state, messageId)
  );
}

const getGenericReadableMessageSelectorProps = (
  state: StateType,
  messageId?: string
): GenericReadableMessageSelectorProps | undefined => {
  const props = getUnsortedMessagePropsByMessageId(state, messageId);
  if (!props || isEmpty(props)) {
    return undefined;
  }

  const msgProps: GenericReadableMessageSelectorProps = pick(props.propsForMessage, [
    'convoId',
    'direction',
    'conversationType',
    'expirationLength',
    'expirationTimestamp',
    'isExpired',
    'isUnread',
    'receivedAt',
    'isKickedFromGroup',
    'isDeleted',
  ]);

  return msgProps;
};

export function useGenericReadableMessageSelectorProps(messageId?: string) {
  return useSelector((state: StateType) =>
    getGenericReadableMessageSelectorProps(state, messageId)
  );
}

function getMessagesOfSelectedConversation(state: StateType) {
  return state.conversations.messages;
}
