/**
 * Any imports from the node side which imports through a chain of imports something calling window.* will break the app.
 * The same applies with the other direction.
 * To fix this issue which keeps happening, we have a few .d.ts (which cannot have a call to window in them) that are shared between both sides, when needed.
 *
 * These .d.ts must not import even indirectly anything else than .d.ts files to avoid the issue above.
 *
 *
 */

import type { Emoji, EmojiMartData } from '@emoji-mart/data'; // ok ?
import {
  MIMEType,
  AttachmentTypeWithPath,
  AttachmentType,
  AttachmentTypeWithPath,
  MediaItemType,
} from './conversationTypes';
import { StagedAttachmentImportedType } from '../util/attachmentsUtil';

// ################################################################## //
//                                                                    //
// IMPORTANT: no imports in this file except from another d.ts which  //
//            is not importing a .ts even indirectly.                 //
//                                                                    //
// ################################################################## //

/**
 * Private chats have always the type `Private`
 * Open groups have always the type `Group`
 * Closed group have the type `Group` when they are not v3 and the type `GROUPV3` when they are v3.
 * To identify between an open or closed group before v3, we need to rely on the prefix (05 is closed groups, 'http%' is opengroup)
 *
 *
 * We will need to support existing closed groups for now, but we will be able to get rid of existing closed groups at some point.
 * When we do get rid of them, we will be able to remove any GROUP conversation with prefix 05 (as they are old closed groups) and update the remaining GROUP to be COMMUNITY instead
 */

export type ConversationTypeEnum = 'group' | 'groupv3' | 'private';

export type ConversationNotificationSettingType = 'all' | 'disabled' | 'mentions_only';

/**
 * Some fields are retrieved from the database as a select, but should not be saved in a commit()
 * TODO (do we, and can we use this)
 */
type ConversationAttributesNotSaved = {
  mentionedUs: boolean;
  unreadCount: number;
};

export type ConversationAttributesWithNotSavedOnes = ConversationAttributes &
  ConversationAttributesNotSaved;

export type ConversationAttributes = {
  id: string;
  type: 'private' | 'groupv3' | 'group';

  // 0 means inactive (undefined and null too but we try to get rid of them and only have 0 = inactive)
  active_at: number; // this field is the one used to sort conversations in the left pane from most recent

  /**
   * lastMessage is actually just a preview of the last message text, shortened to 60 chars.
   * This is to avoid filling the redux store with a huge last message when it's only used in the
   * preview of a conversation (leftpane).
   * The shortening is made in sql.ts directly.
   */
  lastMessage: string | null;
  lastMessageStatus: LastMessageStatusType;
  lastMessageInteractionType: ConversationInteractionType | null;
  lastMessageInteractionStatus: ConversationInteractionStatus | null;

  avatarImageId?: number; // avatar imageID is currently used only for sogs. It's the fileID of the image uploaded and set as the sogs avatar (not only sogs I think, but our profile too?)

  left: boolean; // LEGACY GROUPS ONLY: if we left the group (communities are removed right away so it not relevant to communities) // TODOLATER to remove after legacy closed group are dropped
  isKickedFromGroup: boolean; // LEGACY GROUPS ONLY: if we got kicked from the group (communities just stop polling and a message sent get rejected, so not relevant to communities) // TODOLATER to remove after legacy closed group are dropped

  avatarInProfile?: string; // this is the avatar path locally once downloaded and stored in the application attachments folder

  isTrustedForAttachmentDownload: boolean; // not synced accross devices, this field is used if we should auto download attachments from this conversation or not

  conversationIdOrigin?: string; // Blinded message requests ONLY: The community from which this conversation originated from

  // TODOLATER those two items are only used for legacy closed groups and will be removed when we get rid of the legacy closed groups support
  lastJoinedTimestamp: number; // ClosedGroup: last time we were added to this group // TODOLATER to remove after legacy closed group are dropped
  zombies: Array<string>; // only used for closed groups. Zombies are users which left but not yet removed by the admin // TODOLATER to remove after legacy closed group are dropped

  // ===========================================================================
  // All of the items below are duplicated one way or the other with libsession.
  // It would be nice to at some point be able to only rely on libsession dumps
  // for those so there is no need to keep them in sync, but just have them in the dumps.
  // Note: If we do remove them, we also need to add some logic to the wrappers. For instance, we can currently search by nickname or display name and that works through the DB.
  displayNameInProfile?: string; // no matter the type of conversation, this is the real name as set by the user/name of the open or closed group
  nickname?: string; // this is the name WE gave to that user (only applicable to private chats, not closed group neither opengroups)
  profileKey?: string; // Consider this being a hex string if it is set
  triggerNotificationsFor: ConversationNotificationSettingType;
  avatarPointer?: string; // this is the url of the avatar on the file server v2. we use this to detect if we need to redownload the avatar from someone (not used for opengroups)

  /** in seconds, 0 means no expiration */
  expireTimer: number;

  members: Array<string>; // groups only members are all members for this group. zombies excluded (not used for communities)
  groupAdmins: Array<string>; // for sogs and closed group: the unique admins of that group

  priority: number; // -1 = hidden (contact and NTS only), 0 = normal, 1 = pinned

  isApproved: boolean; // if we sent a message request or sent a message to this contact, we approve them. If isApproved & didApproveMe, a message request becomes a contact
  didApproveMe: boolean; // if our message request was approved already (or they've sent us a message request/message themselves). If isApproved & didApproveMe, a message request becomes a contact

  markedAsUnread: boolean; // Force the conversation as unread even if all the messages are read. Used to highlight a conversation the user wants to check again later, synced.

  blocksSogsMsgReqsTimestamp: number; // if the convo is blinded and the user has denied contact through sogs, this field be set to the user's latest message timestamp

  /** disappearing messages setting for this conversation */
  expirationMode: DisappearingMessageConversationModeType;
  // TODO legacy messages support will be removed in a future release
  // TODO we need to make a migration to remove this value from the db since the implementation is hacky
  /** to warn the user that the person he is talking to is using an old client which might cause issues */
  hasOutdatedClient?: string;
};

export type LastMessageStatusType = 'sending' | 'sent' | 'read' | 'error' | undefined;
export type ConversationInteractionStatus = 'start' | 'loading' | 'error' | 'complete';

export type ConversationInteractionType = 'hide' | 'leave';

export type DisappearingMessageConversationModeType =
  | 'off'
  | 'deleteAfterRead'
  | 'deleteAfterSend'
  | 'legacy';

export type LastMessageType = {
  status: LastMessageStatusType;
  text: string | null;
  interactionType: ConversationInteractionType | null;
  interactionStatus: ConversationInteractionStatus | null;
};

export type InteractionNotificationType = {
  interactionType: ConversationInteractionType;
  interactionStatus: ConversationInteractionStatus;
};
/**
 * This closely matches ConversationAttributes except making a lot of fields optional.
 * The size of the redux store is an issue considering the number of conversations we have, so having optional fields here
 * allows us to not have them set if they have their default values.
 */

export type ReduxConversationType = {
  id: string;
  /**
   * This must hold the real session username of the user for a private chat (not the nickname), and the real name of the group/closed group otherwise
   */
  displayNameInProfile?: string;
  nickname?: string;

  activeAt?: number;
  lastMessage?: LastMessageType;
  type: ConversationTypeEnum;
  isMe?: boolean;
  isPublic?: boolean;
  isPrivate?: boolean; // !isPrivate means isGroup (group or community)
  weAreAdmin?: boolean;
  unreadCount?: number;
  mentionedUs?: boolean;
  expirationMode?: DisappearingMessageConversationModeType;
  expireTimer?: number;
  hasOutdatedClient?: string;
  isTyping?: boolean;
  isBlocked?: boolean;
  isKickedFromGroup?: boolean;
  left?: boolean;
  avatarPath?: string | null; // absolute filepath to the avatar
  groupAdmins?: Array<string>; // admins for closed groups and admins for open groups
  members?: Array<string>; // members for closed groups only
  zombies?: Array<string>; // members for closed groups only

  /**
   * If this is undefined, it means all notification are enabled
   */
  currentNotificationSetting?: ConversationNotificationSettingType;

  priority?: number; // undefined means 0
  isInitialFetchingInProgress?: boolean;
  isApproved?: boolean;
  didApproveMe?: boolean;

  isMarkedUnread?: boolean;

  blocksSogsMsgReqsTimestamp?: number; // undefined means 0
};

export type NotificationForConvoOption = {
  name: string;
  value: ConversationNotificationSettingType;
};
export type MessageModelType = 'incoming' | 'outgoing';

export type MessageAttributes = {
  // the id of the message
  // this can have several uses:
  id: string;
  source: string;
  quote?: any;
  received_at?: number;
  sent_at?: number;
  preview?: any;
  reaction?: Reaction;
  reacts?: ReactionList;
  reactsIndex?: number;
  body?: string;
  expirationType?: DisappearingMessageType;
  /** in seconds, 0 means no expiration */
  expireTimer: number;
  /** in milliseconds */
  expirationStartTimestamp: number;
  expires_at?: number;
  expirationTimerUpdate?: ExpirationTimerUpdate;
  read_by: Array<string>; // we actually only care about the length of this. values are not used for anything
  type: MessageModelType;
  group_update?: MessageGroupUpdate;
  groupInvitation?: any;
  attachments?: any;
  conversationId: string;
  errors?: any;
  flags?: number;
  hasAttachments: 1 | 0;
  hasFileAttachments: 1 | 0;
  hasVisualMediaAttachments: 1 | 0;
  /**
   * 1 means unread, 0 or anything else is read.
   * You can use the values from READ_MESSAGE_STATE.unread and READ_MESSAGE_STATE.read
   */
  unread: number;
  group?: any;
  /**
   * timestamp is the sent_at timestamp, which is the envelope.timestamp
   */
  timestamp?: number;
  status?: LastMessageStatusType;
  sent_to: Array<string>;
  sent: boolean;

  /**
   * The serverId is the id on the open group server itself.
   * Each message sent to an open group gets a serverId.
   * This is not the id for the server, but the id ON the server.
   *
   * This field is not set for a message not on an opengroup server.
   */
  serverId?: number;
  /**
   * This is the timestamp of that messages as it was saved by the Open group server.
   * We rely on this one to order Open Group messages.
   * This field is not set for a message not on an opengroup server.
   */
  serverTimestamp?: number;
  /**
   * This field is set to true if the message is for a public server.
   * This is useful to make the Badge `Public` Appear on a sent message to a server, even if we did not get
   * the response from the server yet that this message was successfully added.
   */
  isPublic: boolean;

  /**
   * sentSync set to true means we just triggered the sync message for this Private Chat message.
   * We did not yet get the message sent confirmation, it was just added to the Outgoing MessageQueue
   */
  sentSync: boolean;

  /**
   * synced set to true means that this message was successfully sent by our current device to our other devices.
   * It is set to true when the MessageQueue did effectively sent our sync message without errors.
   */
  synced: boolean;
  sync: boolean;

  direction: MessageModelType;

  /**
   * This is used for when a user screenshots or saves an attachment you sent.
   * We display a small message just below the message referenced
   */
  dataExtractionNotification?: DataExtractionNotificationMsg;

  /**
   * For displaying a message to notifying when a request has been accepted.
   */
  messageRequestResponse?: MessageRequestResponseMsg;

  /**
   * This field is used for unsending messages and used in sending update expiry, get expiries and unsend message requests.
   */
  messageHash?: string;

  /**
   * This field is used for unsending messages and used in sending unsend message requests.
   */
  isDeleted?: boolean;

  callNotificationType?: CallNotificationType;

  /**
   * This is used when a user has performed an interaction (hiding, leaving, etc.) on a conversation. At the moment, this is only used for showing interaction errors.
   */
  interactionNotification?: InteractionNotificationType;
};

export type DataExtractionNotificationMsg = {
  type: number; // screenshot or saving event, based on SignalService.DataExtractionNotification.Type
  source: string; // the guy who made a screenshot
  referencedAttachmentTimestamp: number; // the attachment timestamp he screenshot
};

export type MessageRequestResponseMsg = {
  source: string;
  isApproved: boolean;
};

export type MessageDirection = 'outgoing' | 'incoming';

export type PropsForDataExtractionNotification = DataExtractionNotificationMsg & {
  name: string;
  messageId: string;
};

export type PropsForMessageRequestResponse = MessageRequestResponseMsg & {
  conversationId?: string;
  name?: string;
  messageId: string;
  receivedAt?: number;
  isUnread: boolean;
  isApproved?: boolean;
  source?: string;
};

export type MessageGroupUpdate = {
  left?: Array<string>;
  joined?: Array<string>;
  kicked?: Array<string>;
  name?: string;
};

export type MessageAttributesOptionals = {
  id?: string;
  source: string;
  quote?: any;
  received_at?: number;
  sent_at?: number;
  preview?: any;
  reaction?: Reaction;
  reacts?: ReactionList;
  reactsIndex?: number;
  body?: string;
  expirationType?: DisappearingMessageType;
  expireTimer?: number;
  expirationStartTimestamp?: number;
  expires_at?: number;
  expirationTimerUpdate?: ExpirationTimerUpdate;
  read_by?: Array<string>; // we actually only care about the length of this. values are not used for anything
  type: MessageModelType;
  group_update?: MessageGroupUpdate;
  groupInvitation?: any;
  attachments?: any;
  contact?: any;
  conversationId: string;
  errors?: any;
  flags?: number;
  hasAttachments?: boolean;
  hasFileAttachments?: boolean;
  hasVisualMediaAttachments?: boolean;
  dataExtractionNotification?: {
    type: number;
    source: string;
    referencedAttachmentTimestamp: number;
  };
  messageRequestResponse?: {
    /** 1 means approved, 0 means unapproved. */
    isApproved?: number;
  };
  unread?: number;
  group?: any;
  timestamp?: number;
  status?: LastMessageStatusType;
  sent_to?: Array<string>;
  sent?: boolean;
  serverId?: number;
  serverTimestamp?: number;
  isPublic?: boolean;
  sentSync?: boolean;
  synced?: boolean;
  sync?: boolean;
  direction?: MessageModelType;
  messageHash?: string;
  isDeleted?: boolean;
  callNotificationType?: CallNotificationType;
  interactionNotification?: InteractionNotificationType;
};
/**
 * Those props are the one generated from a single Message improved by the one by the app itself.
 * Some of the one added comes from the MessageList, some from redux, etc..
 */

export type MessageRenderingProps = PropsForMessageWithConvoProps & {
  disableMenu?: boolean;
  /** Note: this should be formatted for display */
  attachments?: Array<AttachmentTypeWithPath>; // vs Array<PropsForAttachment>;

  // whether or not to allow selecting the message
  multiSelectMode: boolean;
  firstMessageOfSeries: boolean;
  lastMessageOfSeries: boolean;

  sortedReacts?: SortedReactionList;
};
export type MessageResultProps = MessageAttributes & { snippet: string };
export type DisappearingMessageType =
  | 'unknown'
  | Exclude<DisappearingMessageConversationModeType, 'off' | 'legacy'>;
export type CallNotificationType = 'missed-call' | 'started-call' | 'answered-a-call';

export type PropsForCallNotification = {
  notificationType: CallNotificationType;
  messageId: string;
};

export type MessageModelPropsWithoutConvoProps = {
  propsForMessage: PropsForMessageWithoutConvoProps;
  propsForExpiringMessage?: PropsForExpiringMessage;
  propsForGroupInvitation?: PropsForGroupInvitation;
  propsForTimerNotification?: PropsForExpirationTimer;
  propsForDataExtractionNotification?: PropsForDataExtractionNotification;
  propsForGroupUpdateMessage?: PropsForGroupUpdate;
  propsForCallNotification?: PropsForCallNotification;
  propsForMessageRequestResponse?: PropsForMessageRequestResponse;
  propsForQuote?: PropsForQuote;
  propsForInteractionNotification?: PropsForInteractionNotification;
};

export type MessageModelPropsWithConvoProps = SortedMessageModelProps & {
  propsForMessage: PropsForMessageWithConvoProps;
};

export type ContactPropsMessageDetail = {
  status: string | undefined;
  pubkey: string;
  name?: string | null;
  profileName?: string | null;
  avatarPath?: string | null;
  errors?: Array<Error>;
};

export type FindAndFormatContactType = {
  pubkey: string;
  avatarPath: string | null;
  name: string | null;
  profileName: string | null;
  isMe: boolean;
};

export type PropsForExpiringMessage = {
  convoId?: string;
  messageId: string;
  direction: MessageModelType;
  receivedAt?: number;
  isUnread?: boolean;
  expirationTimestamp?: number | null;
  expirationDurationMs?: number | null;
  isExpired?: boolean;
};

export type PropsForExpirationTimer = {
  expirationMode: DisappearingMessageConversationModeType;
  timespanText: string;
  timespanSeconds: number | null;
  disabled: boolean;
  pubkey: string;
  avatarPath: string | null;
  name: string | null;
  profileName: string | null;
  type: 'fromMe' | 'fromSync' | 'fromOther';
  messageId: string;
};

export type PropsForGroupUpdateGeneral = {
  type: 'general';
};

export type PropsForGroupUpdateAdd = {
  type: 'add';
  added: Array<string>;
};

export type PropsForGroupUpdateKicked = {
  type: 'kicked';
  kicked: Array<string>;
};

export type PropsForGroupUpdateLeft = {
  type: 'left';
  left: Array<string>;
};

export type PropsForGroupUpdateName = {
  type: 'name';
  newName: string;
};

export type PropsForGroupUpdateType =
  | PropsForGroupUpdateGeneral
  | PropsForGroupUpdateAdd
  | PropsForGroupUpdateKicked
  | PropsForGroupUpdateName
  | PropsForGroupUpdateLeft;

export type PropsForGroupUpdate = {
  change: PropsForGroupUpdateType;
  messageId: string;
};

export type PropsForGroupInvitation = {
  serverName: string;
  url: string;
  direction: MessageModelType;
  acceptUrl: string;
  messageId: string;
};

export type PropsForAttachment = {
  id: number;
  contentType: string;
  caption?: string;
  size: number;
  width?: number;
  height?: number;
  duration?: string;
  url: string;
  path: string;
  fileSize: string | null;
  isVoiceMessage: boolean;
  pending: boolean;
  fileName: string;
  error?: number; // if the download somhehow failed, this will be set to true and be 0-1 once saved in the db
  screenshot: {
    contentType: string;
    width: number;
    height: number;
    url?: string;
    path?: string;
  } | null;
  thumbnail: {
    contentType: string;
    width: number;
    height: number;
    url?: string;
    path?: string;
  } | null;
};

export type PropsForQuote = {
  text?: string;
  attachment?: QuotedAttachmentType;
  author: string;
  convoId?: string;
  id?: string; // this is the quoted message timestamp
  isFromMe?: boolean;
  referencedMessageNotFound?: boolean;
};

export type PropsForInteractionNotification = {
  notificationType: InteractionNotificationType;
  convoId: string;
  messageId: string;
  receivedAt: number;
  isUnread: boolean;
};

export type PropsForMessageWithoutConvoProps = {
  id: string; // messageId
  direction: MessageModelType;
  timestamp: number;
  sender: string; // this is the sender
  convoId: string; // this is the conversation in which this message was sent
  text?: string;

  receivedAt?: number;
  serverTimestamp?: number;
  serverId?: number;
  status?: LastMessageStatusType;
  attachments?: Array<PropsForAttachment>;
  reacts?: ReactionList;
  reactsIndex?: number;
  previews?: Array<any>;
  quote?: PropsForQuote;
  messageHash?: string;
  isDeleted?: boolean;
  isUnread?: boolean;
  expirationType?: DisappearingMessageType;
  expirationDurationMs?: number;
  expirationTimestamp?: number | null;
  isExpired?: boolean;
  isTrustedForAttachmentDownload?: boolean;
};

export type PropsForMessageWithConvoProps = PropsForMessageWithoutConvoProps & {
  conversationType: ConversationTypeEnum;
  isPublic: boolean;
  isKickedFromGroup: boolean;
  weAreAdmin: boolean;
  isSenderAdmin: boolean;
  isDeletable: boolean;
  isDeletableForEveryone: boolean;
  isBlocked: boolean;
  isDeleted?: boolean;
}; // Used for display

export type AttachmentType = {
  caption?: string;
  contentType: MIMEType;
  fileName: string;
  /** Not included in protobuf, needs to be pulled from flags */
  isVoiceMessage?: boolean;
  /** For messages not already on disk, this will be a data url */
  url: string;
  videoUrl?: string;
  size?: number;
  fileSize: string | null;
  pending?: boolean;
  width?: number;
  height?: number;
  duration?: string;
  screenshot: {
    height: number;
    width: number;
    url?: string;
    contentType: MIMEType;
  } | null;
  thumbnail: {
    height: number;
    width: number;
    url?: string;
    contentType: MIMEType;
  } | null;
};

export type AttachmentTypeWithPath = AttachmentType & {
  path: string;
  id: number;
  flags?: number;
  error?: any;

  screenshot: {
    height: number;
    width: number;
    url?: string;
    contentType: MIMEType;
    path?: string;
  } | null;
  thumbnail: {
    height: number;
    width: number;
    url?: string;
    contentType: MIMEType;
    path?: string;
  } | null;
};
export type FixedBaseEmoji = Emoji & {
  search?: string;
  // props from emoji panel click event
  native?: string;
  aliases?: Array<string>;
  shortcodes?: string;
  unified?: string;
};

export type NativeEmojiData = EmojiMartData & {
  ariaLabels?: Record<string, string>;
};

export type Reaction = {
  // this is in fact a uint64 so we will have an issue
  id: number; // original message timestamp
  author: string;
  emoji: string;
  action: Action;
};
// used for logic operations with reactions i.e responses, db, etc.

export type ReactionList = Record<
  string,
  {
    count: number;
    index: number; // relies on reactsIndex in the message model
    senders: Array<string>;
    you: boolean; // whether we are in the senders list, used within 1-1 and closed groups for ignoring duplicate data messages, used within opengroups since we dont always have the full list of senders.
  }
>;
// used when rendering reactions to guarantee sorted order using the index

export type SortedReactionList = Array<
  [string, { count: number; index: number; senders: Array<string>; you?: boolean }]
>;

export type OpenGroupReaction = {
  index: number;
  count: number;
  you: boolean;
  reactors: Array<string>;
};

export type OpenGroupReactionList = Record<string, OpenGroupReaction>;

export type OpenGroupReactionResponse = {
  added?: boolean;
  removed?: boolean;
  seqno: number;
};
export type SortedMessageModelProps = MessageModelPropsWithoutConvoProps & {
  firstMessageOfSeries: boolean;
  lastMessageOfSeries: boolean;
};
export type QuoteProps = {
  author: string;
  isFromMe: boolean;
  isIncoming: boolean;
  referencedMessageNotFound: boolean;
  text?: string;
  attachment?: QuotedAttachmentType;

  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

export type QuotedAttachmentThumbnailType = {
  contentType: MIMEType;
  /** Not included in protobuf, and is loaded asynchronously */
  objectUrl?: string;
};

export type QuotedAttachmentType = {
  contentType: MIMEType;
  fileName: string;
  /** Not included in protobuf */
  isVoiceMessage: boolean;
  thumbnail?: QuotedAttachmentThumbnailType;
};
export type DisappearAfterSendOnly = Exclude<DisappearingMessageType, 'deleteAfterRead'>;
// TODO legacy messages support will be removed in a future release
// expirationType will no longer have an undefined option
/** Used for setting disappearing messages in conversations */

export type ExpirationTimerUpdate = {
  expirationType: DisappearingMessageType | undefined;
  expireTimer: number;
  source: string;
  /** updated setting from another device */
  fromSync?: boolean;
};

export type DisappearingMessageUpdate = {
  expirationType: DisappearingMessageType;
  expirationTimer: number;
  // This is used for the expirationTimerUpdate
  // TODO legacy messages support will be removed in a future release
  isLegacyConversationSettingMessage?: boolean;
  isLegacyDataMessage?: boolean;
  isDisappearingMessagesV2Released?: boolean;
  messageExpirationFromRetrieve: number | null;
};

export type ReadyToDisappearMsgUpdate = Pick<
  DisappearingMessageUpdate,
  'expirationType' | 'expirationTimer' | 'messageExpirationFromRetrieve'
>;
export type MIMEType = string;
export type OpenGroupRequestCommonType = {
  serverUrl: string;
  roomId: string;
};

export type OpenGroupCapabilityRequest = {
  server: string;
  endpoint: string;
  serverPubKey: string;
  headers: Record<string, string | number>;
  method: string;
  useV4: boolean;
};

export type OpenGroupV2Info = {
  id: string;
  name: string;
  imageId?: string;
  capabilities?: Array<string>;
};

export type OpenGroupV2InfoJoinable = OpenGroupV2Info & {
  completeUrl: string;
  base64Data?: string;
};
export type SessionSettingCategory =
  | 'privacy'
  | 'notifications'
  | 'conversations'
  | 'messageRequests'
  | 'appearance'
  | 'permissions'
  | 'help'
  | 'recoveryPhrase'
  | 'ClearData';

export type PasswordAction = 'set' | 'change' | 'remove' | 'enter';

export type EditProfilePictureModalProps = {
  avatarPath: string | null;
  profileName: string | undefined;
  ourId: string;
};
export type SearchOptions = {
  ourNumber: string;
  noteToSelf: string;
  savedMessages: string;
};

export type AdvancedSearchOptions = {
  query: string;
  from?: string;
  before: number;
  after: number;
};
export interface MediaItemType {
  objectURL?: string;
  thumbnailObjectUrl?: string;
  contentType: MIMEType;
  index: number;
  attachment: AttachmentTypeWithPath;
  messageTimestamp: number;
  messageSender: string;
  messageId: string;
}
export type ReplyingToMessageProps = {
  convoId: string;
  id: string; // this is the quoted message timestamp
  author: string;
  timestamp: number;
  text?: string;
  attachments?: Array<any>;
};

export type StagedLinkPreviewImage = {
  data: ArrayBuffer;
  size: number;
  width: number;
  height: number;
  contentType: string;
};

export type StagedLinkPreviewData = {
  isLoaded: boolean;
  title: string | null;
  url: string | null;
  domain: string | null;
  image?: StagedLinkPreviewImage;
};

export type StagedAttachmentType = AttachmentType & {
  file: File;
  path?: string; // a bit hacky, but this is the only way to make our sending audio message be playable, this must be used only for those message
};

export type SendMessageType = {
  body: string;
  attachments: Array<StagedAttachmentImportedType> | undefined;
  quote: any | undefined;
  preview: any | undefined;
  groupInvitation: { url: string | undefined; name: string } | undefined;
};
export type LightBoxOptions = {
  media: Array<MediaItemType>;
  attachment: AttachmentTypeWithPath;
};
