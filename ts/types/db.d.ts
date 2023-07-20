import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export interface AttachmentDownloads {
  id: string | null;
  timestamp: number | null;
  pending: number | null;
  json: string | null;
}

export interface ConfigDump {
  variant: string;
  publicKey: string;
  data: Buffer | null;
}

export interface Conversations {
  id: string | null;
  active_at: number | null;
  type: string | null;
  members: string | null;
  zombies: Generated<string | null>;
  left: number | null;
  expireTimer: number | null;
  mentionedUs: number | null;
  unreadCount: number | null;
  lastMessageStatus: string | null;
  lastMessage: string | null;
  lastJoinedTimestamp: number | null;
  groupAdmins: Generated<string | null>;
  isKickedFromGroup: number | null;
  avatarPointer: string | null;
  nickname: string | null;
  profileKey: string | null;
  triggerNotificationsFor: Generated<string | null>;
  isTrustedForAttachmentDownload: Generated<number | null>;
  priority: Generated<number | null>;
  isApproved: Generated<number | null>;
  didApproveMe: Generated<number | null>;
  avatarInProfile: string | null;
  displayNameInProfile: string | null;
  conversationIdOrigin: string | null;
  avatarImageId: number | null;
  markedAsUnread: number | null;
}

export interface EncryptionKeyPairsForClosedGroupV2 {
  id: Generated<number>;
  groupPublicKey: string | null;
  timestamp: string | null;
  json: string | null;
}

export interface GuardNodes {
  id: Generated<number>;
  ed25519PubKey: string | null;
}

export interface IdentityKeys {
  id: string | null;
  json: string | null;
}

export interface Items {
  id: string | null;
  json: string | null;
}

export interface LastHashes {
  id: string | null;
  snode: string | null;
  hash: string | null;
  expiresAt: number | null;
  namespace: Generated<number>;
}

export interface LokiSchema {
  id: Generated<number>;
  version: number | null;
}

export interface Messages {
  id: string | null;
  json: string | null;
  unread: number | null;
  expires_at: number | null;
  sent: number | null;
  sent_at: number | null;
  conversationId: string | null;
  received_at: number | null;
  source: string | null;
  hasAttachments: number | null;
  hasFileAttachments: number | null;
  hasVisualMediaAttachments: number | null;
  expireTimer: number | null;
  expirationStartTimestamp: number | null;
  type: string | null;
  body: string | null;
  serverId: number | null;
  serverTimestamp: number | null;
  serverHash: string | null;
  isDeleted: number | null;
}

export interface MessagesFts {
  body: string | null;
}

export interface MessagesFtsConfig {
  k: string;
  v: string | null;
}

export interface MessagesFtsContent {
  id: number | null;
  c0: string | null;
}

export interface MessagesFtsData {
  id: number | null;
  block: Buffer | null;
}

export interface MessagesFtsDocsize {
  id: number | null;
  sz: Buffer | null;
}

export interface MessagesFtsIdx {
  segid: string;
  term: string;
  pgno: string | null;
}

export interface NodesForPubkey {
  pubkey: string | null;
  json: string | null;
}

export interface OpenGroupRoomsV2 {
  serverUrl: string;
  roomId: string;
  conversationId: string | null;
  json: string | null;
}

export interface SeenMessages {
  hash: string | null;
  expiresAt: number | null;
}

export interface Unprocessed {
  id: string | null;
  timestamp: number | null;
  version: number | null;
  attempts: number | null;
  envelope: string | null;
  decrypted: string | null;
  source: string | null;
  senderIdentity: string | null;
  serverHash: string | null;
}

export interface DB {
  attachment_downloads: AttachmentDownloads;
  configDump: ConfigDump;
  conversations: Conversations;
  encryptionKeyPairsForClosedGroupV2: EncryptionKeyPairsForClosedGroupV2;
  guardNodes: GuardNodes;
  identityKeys: IdentityKeys;
  items: Items;
  lastHashes: LastHashes;
  loki_schema: LokiSchema;
  messages: Messages;
  messages_fts: MessagesFts;
  messages_fts_config: MessagesFtsConfig;
  messages_fts_content: MessagesFtsContent;
  messages_fts_data: MessagesFtsData;
  messages_fts_docsize: MessagesFtsDocsize;
  messages_fts_idx: MessagesFtsIdx;
  nodesForPubkey: NodesForPubkey;
  openGroupRoomsV2: OpenGroupRoomsV2;
  seenMessages: SeenMessages;
  unprocessed: Unprocessed;
}
