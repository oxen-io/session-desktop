import { DefaultTheme } from 'styled-components';
import _ from 'lodash';
import { QuotedAttachmentType } from '../components/conversation/Quote';
import { AttachmentType } from '../types/Attachment';
import { Contact } from '../types/Contact';
import uuid from 'uuid';
import { UserUtils } from '../session/utils';
import { ConversationPrivateOrGroup } from '../state/ducks/conversations';

export type MessageModelType = 'incoming' | 'outgoing';
export type MessageDeliveryStatus =
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'error'
  | 'pow';

// Those fields are the one required, but that we can generate if they are not given
interface BasicRequiredMessageAttributes {
  id: string;
  source: string;
  expireTimer: number;
  read_by: Array<string>;
  delivered_to: Array<string>;
  decrypted_at: number;
  recipients: Array<string>;
  hasAttachments: boolean,
  hasFileAttachments: boolean,
  hasVisualMediaAttachments: boolean,
  schemaVersion: number;
  unread: boolean;
  sent_to: Array<string>;
  sent: boolean;
  calculatingPoW: boolean;
  isPublic: boolean;
  sentSync: boolean;
  synced: boolean;
  sync: boolean;
}

// what is read from the DB, once a message has been saved
export interface MessageAttributes extends BasicRequiredMessageAttributes {
  source: string;
  quote?: any;
  received_at?: number;
  sent_at?: number;
  destination?: string;
  preview?: any;
  body?: string;
  expirationStartTimestamp?: number;
  expires_at?: number;
  delivered?: number;
  type: MessageModelType;
  group_update?: any;
  groupInvitation?: any;
  attachments?: any;
  contact?: any;
  conversationId: any;
  errors?: any;
  flags?: number;
  expirationTimerUpdate?: any;
  group?: any;
  timestamp?: number;
  status?: MessageDeliveryStatus;
  dataMessage?: any;
  serverId?: number;
  serverTimestamp?: number;
  snippet?: any;
  direction?: any;
}


interface BasicOptionalMessageAttributes {
  source: string;
  id?: string;
  expireTimer?: number;
  read_by?: Array<string>;
  delivered_to?: Array<string>;
  decrypted_at?: number;
  recipients?: Array<string>;
  hasAttachments?: boolean,
  hasFileAttachments?: boolean,
  hasVisualMediaAttachments?: boolean,
  schemaVersion?: number;
  unread?: boolean;
  sent_to?: Array<string>;
  sent?: boolean;
  calculatingPoW?: boolean;
  isPublic?: boolean;
  sentSync?: boolean;
  synced?: boolean;
  sync?: boolean;
}


const optionalToRequiredFilling = (
  optAttributes: BasicOptionalMessageAttributes
) : BasicRequiredMessageAttributes => {
  return  _.defaults(optAttributes, {
    expireTimer: 0, // disabled
    read_by: [],
    delivered_to: [],
    decrypted_at: Date.now(),
    recipients: [],
    hasAttachments: false,
    hasFileAttachments: false,
    hasVisualMediaAttachments: false,
    schemaVersion: 0,
    unread: false,
    sent_to: [],
    sent: false,
    calculatingPoW: false,
    isPublic: false,
    sentSync: false,
    synced: false,
    sync: false,
    id: uuid(),
  });
};

// what is used as based type to create new messages
// most of the fields are optional, and we need to make sure they are set before inserting them to the db
interface MessageAttributesOptionals extends BasicOptionalMessageAttributes {
  id?: string;
  quote?: any;
  received_at?: number;
  sent_at?: number;
  destination?: string;
  preview?: any;
  body?: string;
  expirationStartTimestamp?: number;
  expires_at?: number;
  delivered?: number;
  type: MessageModelType;
  group_update?: any;
  groupInvitation?: any;
  attachments?: any;
  contact?: any;
  conversationId: any;
  errors?: any;
  flags?: number;
  expirationTimerUpdate?: any;
  group?: any;
  timestamp?: number;
  status?: MessageDeliveryStatus;
  dataMessage?: any;
  serverId?: number;
  serverTimestamp?: number;
  snippet?: any;
  direction?: string;
}


export interface IncomingMessageCreationAttributes extends MessageAttributesOptionals {
}

export interface OutgoingMessageCreationAttributes extends MessageAttributesOptionals {
}





/**
 * This function mutates optAttributes
 * @param optAttributes the entry object attributes to set the defaults to.
 */
export const initOutgoingMessage = (
  optAttributes: OutgoingMessageCreationAttributes
): MessageAttributes => {
  const allDefaultSet = optionalToRequiredFilling(optAttributes);
  return  _.defaults(allDefaultSet, optAttributes, {
    status: 'sending',
    direction: 'outgoing',
    source: UserUtils.getOurPubKeyStrFromCache(),
  });
};

/**
 * This function mutates optAttributes
 * @param optAttributes the entry object attributes to set the defaults to.
 */
export const initIncomingMessage = (
  optAttributes: IncomingMessageCreationAttributes
): MessageAttributes => {
  const allDefaultSet = optionalToRequiredFilling(optAttributes);
  return  _.defaults(allDefaultSet, optAttributes, {
    direction: 'incoming',
    source: optAttributes.source,
  });
};


export interface MessageRegularProps {
  disableMenu?: boolean;
  isDeletable: boolean;
  isAdmin?: boolean;
  weAreAdmin?: boolean;
  text?: string;
  id: string;
  collapseMetadata?: boolean;
  direction: MessageModelType;
  timestamp: number;
  serverTimestamp?: number;
  status?: MessageDeliveryStatus;
  // What if changed this over to a single contact like quote, and put the events on it?
  contact?: Contact & {
    onSendMessage?: () => void;
    onClick?: () => void;
  };
  authorName?: string;
  authorProfileName?: string;
  /** Note: this should be formatted for display */
  authorPhoneNumber: string;
  conversationType: ConversationPrivateOrGroup;
  attachments?: Array<AttachmentType>;
  quote?: {
    text: string;
    attachment?: QuotedAttachmentType;
    isFromMe: boolean;
    authorPhoneNumber: string;
    authorProfileName?: string;
    authorName?: string;
    messageId?: string;
    onClick: (data: any) => void;
    referencedMessageNotFound: boolean;
  };
  previews: Array<any>;
  authorAvatarPath?: string;
  isExpired: boolean;
  expirationLength?: number;
  expirationTimestamp?: number;
  convoId: string;
  isPublic?: boolean;
  selected: boolean;
  isKickedFromGroup: boolean;
  // whether or not to show check boxes
  multiSelectMode: boolean;
  firstMessageOfSeries: boolean;
  isUnread: boolean;
  isQuotedMessageToAnimate?: boolean;

  onClickAttachment?: (attachment: AttachmentType) => void;
  onClickLinkPreview?: (url: string) => void;
  onCopyText?: () => void;
  onSelectMessage: (messageId: string) => void;
  onReply?: (messagId: number) => void;
  onRetrySend?: () => void;
  onDownload?: (attachment: AttachmentType) => void;
  onDeleteMessage: (messageId: string) => void;
  onCopyPubKey?: () => void;
  onBanUser?: () => void;
  onShowDetail: () => void;
  onShowUserDetails: (userPubKey: string) => void;
  markRead: (readAt: number) => Promise<void>;
  theme: DefaultTheme;
}

// export interface MessageModel extends Backbone.Model<MessageAttributes> {
//     setServerTimestamp(serverTimestamp: any);
//     setServerId(serverId: any);
//     setIsPublic(arg0: boolean);
//     idForLogging: () => string;
//     isGroupUpdate: () => boolean;
//     isExpirationTimerUpdate: () => boolean;
//     getNotificationText: () => string;
//     markRead: (readAt: number) => Promise<void>;
//     merge: (other: MessageModel) => void;
//     saveErrors: (error: any) => promise<void>;
//     sendSyncMessageOnly: (message: any) => void;
//     isUnread: () => boolean;
//     commit: () => Promise<number>;
//     getPropsForMessageDetail: () => any;
//     getConversation: () => ConversationModel;
//     handleMessageSentSuccess: (sentMessage: any, wrappedEnvelope: any) => any;
//     handleMessageSentFailure: (sentMessage: any, error: any) => any;

//     propsForMessage?: MessageRegularProps;
//     propsForTimerNotification?: any;
//     propsForGroupInvitation?: any;
//     propsForGroupNotification?: any;
//     firstMessageOfSeries: boolean;
// }
