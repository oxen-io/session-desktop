// eslint:disable: no-require-imports no-var-requires one-variable-per-declaration no-void-expression function-name

import _, { isEmpty } from 'lodash';
import { MessageResultProps } from '../components/search/MessageSearchResults';
import { ConversationModel } from '../models/conversation';
import { ConversationAttributes } from '../models/conversationAttributes';
import { MessageCollection, MessageModel } from '../models/message';
import { MessageAttributes, MessageDirection } from '../models/messageType';
import { HexKeyPair } from '../receiver/keypairs';
import { Quote } from '../receiver/types';
import { getSodiumRenderer } from '../session/crypto';
import { DisappearingMessages } from '../session/disappearing_messages';
import { PubKey } from '../session/types';
import {
  AsyncWrapper,
  MsgDuplicateSearchOpenGroup,
  SaveConversationReturn,
  UnprocessedDataNode,
  UpdateLastHashType,
} from '../types/sqlSharedTypes';
import * as dataInit from './dataInit';
import { cleanData } from './dataUtils';
import { SNODE_POOL_ITEM_ID } from './settings-key';
import { DataItems } from './dataItems';

const ERASE_SQL_KEY = 'erase-sql-key';
const ERASE_ATTACHMENTS_KEY = 'erase-attachments';
const CLEANUP_ORPHANED_ATTACHMENTS_KEY = 'cleanup-orphaned-attachments';

export type IdentityKey = {
  id: string;
  publicKey: ArrayBuffer;
  firstUse: boolean;
  nonblockingApproval: boolean;
  secretKey?: string; // found in medium groups
};

export type GuardNode = {
  ed25519PubKey: string;
};

export interface Snode {
  ip: string;
  port: number;
  pubkey_x25519: string;
  pubkey_ed25519: string;
}

export type SwarmNode = Snode & {
  address: string;
};

// Basic
async function shutdown(): Promise<void> {
  // Stop accepting new SQL jobs, flush outstanding queue
  await dataInit.shutdown();
  await close();
}
// Note: will need to restart the app after calling this, to set up afresh
async function close(): Promise<void> {
  await window.Data.close();
}

// Note: will need to restart the app after calling this, to set up afresh
async function removeDB(): Promise<void> {
  await window.Data.removeDB();
}

// Password hash

async function getPasswordHash(): Promise<string | null> {
  return window.Data.getPasswordHash();
}

// Guard Nodes
async function getGuardNodes(): Promise<Array<GuardNode>> {
  return window.Data.getGuardNodes();
}
async function updateGuardNodes(nodes: Array<string>): Promise<void> {
  return window.Data.updateGuardNodes(nodes);
}

async function generateAttachmentKeyIfEmpty() {
  const existingKey = await DataItems.getItemById('local_attachment_encrypted_key');
  if (!existingKey) {
    const sodium = await getSodiumRenderer();
    const encryptingKey = sodium.to_hex(sodium.randombytes_buf(32));
    await DataItems.createOrUpdateItem({
      id: 'local_attachment_encrypted_key',
      value: encryptingKey,
    });
    // be sure to write the new key to the cache. so we can access it straight away
    await window.Storage.put('local_attachment_encrypted_key', encryptingKey);
  }
}

// Swarm nodes
async function getSwarmNodesForPubkey(pubkey: string): Promise<Array<string>> {
  return window.Data.getSwarmNodesForPubkey(pubkey);
}

async function updateSwarmNodesForPubkey(
  pubkey: string,
  snodeEdKeys: Array<string>
): Promise<void> {
  await window.Data.updateSwarmNodesForPubkey(pubkey, snodeEdKeys);
}

async function clearOutAllSnodesNotInPool(edKeysOfSnodePool: Array<string>): Promise<void> {
  await window.Data.clearOutAllSnodesNotInPool(edKeysOfSnodePool);
}

// Closed group

/**
 * The returned array is ordered based on the timestamp, the latest is at the end.
 */
async function getAllEncryptionKeyPairsForGroup(
  groupPublicKey: string | PubKey
): Promise<Array<HexKeyPair> | undefined> {
  const pubkey = (groupPublicKey as PubKey).key || (groupPublicKey as string);
  return window.Data.getAllEncryptionKeyPairsForGroup(pubkey);
}

async function getLatestClosedGroupEncryptionKeyPair(
  groupPublicKey: string
): Promise<HexKeyPair | undefined> {
  return window.Data.getLatestClosedGroupEncryptionKeyPair(groupPublicKey);
}

async function addClosedGroupEncryptionKeyPair(
  groupPublicKey: string,
  keypair: HexKeyPair
): Promise<void> {
  await window.Data.addClosedGroupEncryptionKeyPair(groupPublicKey, keypair);
}

async function removeAllClosedGroupEncryptionKeyPairs(groupPublicKey: string): Promise<void> {
  return window.Data.removeAllClosedGroupEncryptionKeyPairs(groupPublicKey);
}

// Conversation
async function saveConversation(data: ConversationAttributes): Promise<SaveConversationReturn> {
  const cleaned = cleanData(data) as ConversationAttributes;
  /**
   * Merging two conversations in `handleMessageRequestResponse` introduced a bug where we would mark conversation active_at to be -Infinity.
   * The root issue has been fixed, but just to make sure those INVALID DATE does not show up, update those -Infinity active_at conversations to be now(), once.,
   */
  if (cleaned.active_at === -Infinity) {
    cleaned.active_at = Date.now();
  }

  return window.Data.saveConversation(cleaned);
}

async function fetchConvoMemoryDetails(convoId: string): Promise<SaveConversationReturn> {
  return window.Data.fetchConvoMemoryDetails(convoId);
}

async function getConversationById(id: string): Promise<ConversationModel | undefined> {
  const data = await window.Data.getConversationById(id);
  if (data) {
    return new ConversationModel(data);
  }
  return undefined;
}

async function removeConversation(id: string): Promise<void> {
  const existing = await getConversationById(id);

  // Note: It's important to have a fully database-hydrated model to delete here because
  //   it needs to delete all associated on-disk files along with the database delete.
  if (existing) {
    await window.Data.removeConversation(id);
    await existing.cleanup();
  }
}

async function getAllConversations(): Promise<Array<ConversationModel>> {
  const conversationsAttrs =
    (await window.Data.getAllConversations()) as Array<ConversationAttributes>;

  return conversationsAttrs.map(attr => new ConversationModel(attr));
}

/**
 * This returns at most MAX_PUBKEYS_MEMBERS members, the last MAX_PUBKEYS_MEMBERS members who wrote in the chat
 */
async function getPubkeysInPublicConversation(id: string): Promise<Array<string>> {
  return window.Data.getPubkeysInPublicConversation(id);
}

async function searchConversations(query: string): Promise<Array<any>> {
  const conversations = await window.Data.searchConversations(query);
  return conversations;
}

async function searchMessages(query: string, limit: number): Promise<Array<MessageResultProps>> {
  const messages = (await window.Data.searchMessages(query, limit)) as Array<MessageResultProps>;
  return _.uniqWith(messages, (left: { id: string }, right: { id: string }) => {
    return left.id === right.id;
  });
}

/**
 * Returns just json objects not MessageModel
 */
async function searchMessagesInConversation(
  query: string,
  conversationId: string,
  limit: number
): Promise<Array<MessageAttributes>> {
  const messages = (await window.Data.searchMessagesInConversation(
    query,
    conversationId,
    limit
  )) as Array<MessageAttributes>;
  return messages;
}

// Message

async function cleanSeenMessages(): Promise<void> {
  await window.Data.cleanSeenMessages();
}

async function cleanLastHashes(): Promise<void> {
  await window.Data.cleanLastHashes();
}

async function saveSeenMessageHashes(
  data: Array<{
    expiresAt: number;
    hash: string;
  }>
): Promise<void> {
  await window.Data.saveSeenMessageHashes(cleanData(data));
}

async function updateLastHash(data: UpdateLastHashType): Promise<void> {
  await window.Data.updateLastHash(cleanData(data));
}

async function saveMessage(data: MessageAttributes): Promise<string> {
  const cleanedData = cleanData(data);
  const id = await window.Data.saveMessage(cleanedData);
  DisappearingMessages.updateExpiringMessagesCheck();
  return id;
}

async function saveMessages(arrayOfMessages: Array<MessageAttributes>): Promise<void> {
  await window.Data.saveMessages(cleanData(arrayOfMessages));
}

/**
 *
 * @param conversationId the conversation from which to remove all but the most recent disappear timer update
 * @param isPrivate if that conversation is private, we keep a expiration timer update for each sender
 * @returns the array of messageIds removed, or [] if none were removed
 */
async function cleanUpExpirationTimerUpdateHistory(
  conversationId: string,
  isPrivate: boolean
): Promise<Array<string>> {
  return window.Data.cleanUpExpirationTimerUpdateHistory(conversationId, isPrivate);
}

async function removeMessage(id: string): Promise<void> {
  const message = await getMessageById(id, true);

  // Note: It's important to have a fully database-hydrated model to delete here because
  //   it needs to delete all associated on-disk files along with the database delete.
  if (message) {
    await window.Data.removeMessage(id);
    await message.cleanup();
  }
}

/**
 * Note: this method will not clean up external files, just delete from SQL.
 * Files are cleaned up on app start if they are not linked to any messages
 *
 */
async function removeMessagesByIds(ids: Array<string>): Promise<void> {
  await window.Data.removeMessagesByIds(ids);
}

async function getMessageIdsFromServerIds(
  serverIds: Array<string> | Array<number>,
  conversationId: string
): Promise<Array<string> | undefined> {
  return window.Data.getMessageIdsFromServerIds(serverIds, conversationId);
}

async function getMessageById(
  id: string,
  skipTimerInit: boolean = false
): Promise<MessageModel | null> {
  const message = await window.Data.getMessageById(id);
  if (!message) {
    return null;
  }
  if (skipTimerInit) {
    message.skipTimerInit = skipTimerInit;
  }

  return new MessageModel(message);
}

async function getMessagesById(ids: Array<string>): Promise<Array<MessageModel>> {
  const messages = await window.Data.getMessagesById(ids);
  if (!messages || isEmpty(messages)) {
    return [];
  }
  return messages.map((msg: any) => new MessageModel(msg));
}

async function getMessageByServerId(
  conversationId: string,
  serverId: number,
  skipTimerInit: boolean = false
): Promise<MessageModel | null> {
  const message = await window.Data.getMessageByServerId(conversationId, serverId);
  if (!message) {
    return null;
  }
  if (skipTimerInit) {
    message.skipTimerInit = skipTimerInit;
  }

  return new MessageModel(message);
}

async function filterAlreadyFetchedOpengroupMessage(
  msgDetails: MsgDuplicateSearchOpenGroup
): Promise<MsgDuplicateSearchOpenGroup> {
  const msgDetailsNotAlreadyThere =
    await window.Data.filterAlreadyFetchedOpengroupMessage(msgDetails);
  return msgDetailsNotAlreadyThere || [];
}

/**
 * Fetch all messages that match the sender pubkey and sent_at timestamp
 * @param propsList An array of objects containing a source (the sender id) and timestamp of the message - not to be confused with the serverTimestamp. This is equivalent to sent_at
 * @returns the fetched messageModels
 */
async function getMessagesBySenderAndSentAt(
  propsList: Array<{
    source: string;
    timestamp: number;
  }>
): Promise<MessageCollection | null> {
  const messages = await window.Data.getMessagesBySenderAndSentAt(propsList);

  if (!messages || !messages.length) {
    return null;
  }

  return new MessageCollection(messages);
}

async function getUnreadByConversation(
  conversationId: string,
  sentBeforeTimestamp: number
): Promise<MessageCollection> {
  const messages = await window.Data.getUnreadByConversation(conversationId, sentBeforeTimestamp);
  return new MessageCollection(messages);
}

async function getUnreadDisappearingByConversation(
  conversationId: string,
  sentBeforeTimestamp: number
): Promise<Array<MessageModel>> {
  const messages = await window.Data.getUnreadDisappearingByConversation(
    conversationId,
    sentBeforeTimestamp
  );
  return new MessageCollection(messages).models;
}

async function markAllAsReadByConversationNoExpiration(
  conversationId: string,
  returnMessagesUpdated: boolean // for performance reason we do not return them because usually they are not needed
): Promise<Array<number>> {
  const messagesIds = await window.Data.markAllAsReadByConversationNoExpiration(
    conversationId,
    returnMessagesUpdated
  );
  return messagesIds;
}

// might throw
async function getUnreadCountByConversation(conversationId: string): Promise<number> {
  return window.Data.getUnreadCountByConversation(conversationId);
}

/**
 * Gets the count of messages for a direction
 * @param conversationId Conversation for messages to retrieve from
 * @param type outgoing/incoming
 */
async function getMessageCountByType(
  conversationId: string,
  type?: MessageDirection
): Promise<number> {
  return window.Data.getMessageCountByType(conversationId, type);
}

async function getMessagesByConversation(
  conversationId: string,
  {
    skipTimerInit = false,
    returnQuotes = false,
    messageId = null,
  }: { skipTimerInit?: false; returnQuotes?: boolean; messageId: string | null }
): Promise<{ messages: MessageCollection; quotes: Array<Quote> }> {
  const { messages, quotes } = await window.Data.getMessagesByConversation(conversationId, {
    messageId,
    returnQuotes,
  });

  if (skipTimerInit) {
    // eslint-disable-next-line no-restricted-syntax
    for (const message of messages) {
      message.skipTimerInit = skipTimerInit;
    }
  }

  return {
    messages: new MessageCollection(messages),
    quotes,
  };
}

/**
 * This function should only be used when you don't want to render the messages.
 * It just grabs the last messages of a conversation.
 *
 * To be used when you want for instance to remove messages from a conversations, in order.
 * Or to trigger downloads of a attachments from a just approved contact (clicktotrustSender)
 * @param conversationId the conversationId to fetch messages from
 * @param limit the maximum number of messages to return
 * @param skipTimerInit  see MessageModel.skipTimerInit
 * @returns the fetched messageModels
 */
async function getLastMessagesByConversation(
  conversationId: string,
  limit: number,
  skipTimerInit: boolean
): Promise<MessageCollection> {
  const messages = await window.Data.getLastMessagesByConversation(conversationId, limit);
  if (skipTimerInit) {
    // eslint-disable-next-line no-restricted-syntax
    for (const message of messages) {
      message.skipTimerInit = skipTimerInit;
    }
  }
  return new MessageCollection(messages);
}

async function getLastMessageIdInConversation(conversationId: string) {
  const collection = await getLastMessagesByConversation(conversationId, 1, true);
  return collection.models.length ? collection.models[0].id : null;
}

async function getLastMessageInConversation(conversationId: string) {
  const messages = await window.Data.getLastMessagesByConversation(conversationId, 1);
  // eslint-disable-next-line no-restricted-syntax
  for (const message of messages) {
    message.skipTimerInit = true;
  }

  const collection = new MessageCollection(messages);
  return collection.length ? collection.models[0] : null;
}

async function getOldestMessageInConversation(conversationId: string) {
  const messages = await window.Data.getOldestMessageInConversation(conversationId);
  // eslint-disable-next-line no-restricted-syntax
  for (const message of messages) {
    message.skipTimerInit = true;
  }

  const collection = new MessageCollection(messages);
  return collection.length ? collection.models[0] : null;
}

/**
 * @returns Returns count of all messages in the database
 */
async function getMessageCount() {
  return window.Data.getMessageCount();
}

async function getFirstUnreadMessageIdInConversation(
  conversationId: string
): Promise<string | undefined> {
  return window.Data.getFirstUnreadMessageIdInConversation(conversationId);
}

async function getFirstUnreadMessageWithMention(
  conversationId: string
): Promise<string | undefined> {
  return window.Data.getFirstUnreadMessageWithMention(conversationId);
}

async function hasConversationOutgoingMessage(conversationId: string): Promise<boolean> {
  return window.Data.hasConversationOutgoingMessage(conversationId);
}
async function getLastHashBySnode(
  convoId: string,
  snode: string,
  namespace: number
): Promise<string> {
  return window.Data.getLastHashBySnode(convoId, snode, namespace);
}

async function getSeenMessagesByHashList(hashes: Array<string>): Promise<any> {
  return window.Data.getSeenMessagesByHashList(hashes);
}

async function removeAllMessagesInConversation(conversationId: string): Promise<void> {
  const startFunction = Date.now();
  let start = Date.now();

  let messages;
  do {
    // Yes, we really want the await in the loop. We're deleting 500 at a
    //   time so we don't use too much memory.
    // eslint-disable-next-line no-await-in-loop
    messages = await getLastMessagesByConversation(conversationId, 1000, false);
    if (!messages.length) {
      return;
    }
    window.log.info(
      `removeAllMessagesInConversation getLastMessagesByConversation ${conversationId} ${
        messages.length
      } took ${Date.now() - start}ms`
    );

    // Note: It's very important that these models are fully hydrated because
    //   we need to delete all associated on-disk files along with the database delete.
    const ids = messages.map(message => message.id);
    start = Date.now();
    for (let index = 0; index < messages.length; index++) {
      const message = messages.at(index);
      // eslint-disable-next-line no-await-in-loop
      await message.cleanup();
    }
    window.log.info(
      `removeAllMessagesInConversation messages.cleanup() ${conversationId} took ${
        Date.now() - start
      }ms`
    );
    start = Date.now();

    // eslint-disable-next-line no-await-in-loop
    await window.Data.removeMessagesByIds(ids);
    window.log.info(
      `removeAllMessagesInConversation: removeMessagesByIds ${conversationId} took ${
        Date.now() - start
      }ms`
    );
  } while (messages.length);

  await window.Data.removeAllMessagesInConversation(conversationId);
  window.log.info(
    `removeAllMessagesInConversation: complete time ${conversationId} took ${
      Date.now() - startFunction
    }ms`
  );
}

async function getMessagesBySentAt(sentAt: number): Promise<MessageCollection> {
  const messages = await window.Data.getMessagesBySentAt(sentAt);
  return new MessageCollection(messages);
}

async function getExpiredMessages(): Promise<MessageCollection> {
  const messages = await window.Data.getExpiredMessages();
  return new MessageCollection(messages);
}

async function getOutgoingWithoutExpiresAt(): Promise<MessageCollection> {
  const messages = await window.Data.getOutgoingWithoutExpiresAt();
  return new MessageCollection(messages);
}

async function getNextExpiringMessage(): Promise<MessageCollection> {
  const messages = await window.Data.getNextExpiringMessage();
  return new MessageCollection(messages);
}

// Unprocessed

const getUnprocessedCount: AsyncWrapper<UnprocessedDataNode['getUnprocessedCount']> = () => {
  return window.Data.getUnprocessedCount();
};

const getAllUnprocessed: AsyncWrapper<UnprocessedDataNode['getAllUnprocessed']> = () => {
  return window.Data.getAllUnprocessed();
};

const getUnprocessedById: AsyncWrapper<UnprocessedDataNode['getUnprocessedById']> = id => {
  return window.Data.getUnprocessedById(id);
};

const saveUnprocessed: AsyncWrapper<UnprocessedDataNode['saveUnprocessed']> = data => {
  return window.Data.saveUnprocessed(cleanData(data));
};

const updateUnprocessedAttempts: AsyncWrapper<UnprocessedDataNode['updateUnprocessedAttempts']> = (
  id,
  attempts
) => {
  return window.Data.updateUnprocessedAttempts(id, attempts);
};
const updateUnprocessedWithData: AsyncWrapper<UnprocessedDataNode['updateUnprocessedWithData']> = (
  id,
  data
) => {
  return window.Data.updateUnprocessedWithData(id, cleanData(data));
};

const removeUnprocessed: AsyncWrapper<UnprocessedDataNode['removeUnprocessed']> = id => {
  return window.Data.removeUnprocessed(id);
};

const removeAllUnprocessed: AsyncWrapper<UnprocessedDataNode['removeAllUnprocessed']> = () => {
  return window.Data.removeAllUnprocessed();
};

// Attachment downloads

async function getNextAttachmentDownloadJobs(limit: number): Promise<any> {
  return window.Data.getNextAttachmentDownloadJobs(limit);
}
async function saveAttachmentDownloadJob(job: any): Promise<void> {
  await window.Data.saveAttachmentDownloadJob(job);
}
async function setAttachmentDownloadJobPending(id: string, pending: boolean): Promise<void> {
  await window.Data.setAttachmentDownloadJobPending(id, pending ? 1 : 0);
}
async function resetAttachmentDownloadPending(): Promise<void> {
  await window.Data.resetAttachmentDownloadPending();
}
async function removeAttachmentDownloadJob(id: string): Promise<void> {
  await window.Data.removeAttachmentDownloadJob(id);
}
async function removeAllAttachmentDownloadJobs(): Promise<void> {
  await window.Data.removeAllAttachmentDownloadJobs();
}

// Other

async function removeAll(): Promise<void> {
  await window.Data.removeAll();
}

async function removeAllConversations(): Promise<void> {
  await window.Data.removeAllConversations();
}

async function cleanupOrphanedAttachments(): Promise<void> {
  await dataInit.callChannel(CLEANUP_ORPHANED_ATTACHMENTS_KEY);
}

// Note: will need to restart the app after calling this, to set up afresh
async function removeOtherData(): Promise<void> {
  await Promise.all([
    dataInit.callChannel(ERASE_SQL_KEY),
    dataInit.callChannel(ERASE_ATTACHMENTS_KEY),
  ]);
}

// Functions below here return plain JSON instead of Backbone Models

async function getMessagesWithVisualMediaAttachments(
  conversationId: string,
  limit?: number
): Promise<Array<MessageAttributes>> {
  return window.Data.getMessagesWithVisualMediaAttachments(conversationId, limit);
}

async function getMessagesWithFileAttachments(
  conversationId: string,
  limit: number
): Promise<Array<MessageAttributes>> {
  return window.Data.getMessagesWithFileAttachments(conversationId, limit);
}

async function getSnodePoolFromDb(): Promise<Array<Snode> | null> {
  // this is currently all stored as a big string as we don't really need to do anything with them (no filtering or anything)
  // everything is made in memory and written to disk
  const snodesJson = await Data.getItemById(SNODE_POOL_ITEM_ID);
  if (!snodesJson || !snodesJson.value) {
    return null;
  }

  return JSON.parse(snodesJson.value);
}

async function updateSnodePoolOnDb(snodesAsJsonString: string): Promise<void> {
  await window.Storage.put(SNODE_POOL_ITEM_ID, snodesAsJsonString);
}

// we export them like this instead of directly with the `export function` cause this is helping a lot for testing
export const Data = {
  shutdown,
  close,
  removeDB,
  getPasswordHash,

  // items table logic
  createOrUpdateItem: DataItems.createOrUpdateItem,
  getItemById: DataItems.getItemById,
  getAllItems: DataItems.getAllItems,
  removeItemById: DataItems.removeItemById,

  // guard nodes
  getGuardNodes,
  updateGuardNodes,
  generateAttachmentKeyIfEmpty,
  getSwarmNodesForPubkey,
  updateSwarmNodesForPubkey,
  clearOutAllSnodesNotInPool,
  getAllEncryptionKeyPairsForGroup,
  getLatestClosedGroupEncryptionKeyPair,
  addClosedGroupEncryptionKeyPair,
  removeAllClosedGroupEncryptionKeyPairs,
  saveConversation,
  fetchConvoMemoryDetails,
  getConversationById,
  removeConversation,
  getAllConversations,
  getPubkeysInPublicConversation,
  searchConversations,
  searchMessages,
  searchMessagesInConversation,
  cleanSeenMessages,
  cleanLastHashes,
  saveSeenMessageHashes,
  updateLastHash,
  saveMessage,
  saveMessages,
  removeMessage,
  removeMessagesByIds,
  cleanUpExpirationTimerUpdateHistory,
  getMessageIdsFromServerIds,
  getMessageById,
  getMessagesById,
  getMessagesBySenderAndSentAt,
  getMessageByServerId,
  filterAlreadyFetchedOpengroupMessage,
  getUnreadByConversation,
  getUnreadDisappearingByConversation,
  getUnreadCountByConversation,
  markAllAsReadByConversationNoExpiration,
  getMessageCountByType,
  getMessagesByConversation,
  getLastMessagesByConversation,
  getLastMessageIdInConversation,
  getLastMessageInConversation,
  getOldestMessageInConversation,
  getMessageCount,
  getFirstUnreadMessageIdInConversation,
  getFirstUnreadMessageWithMention,
  hasConversationOutgoingMessage,
  getLastHashBySnode,
  getSeenMessagesByHashList,
  removeAllMessagesInConversation,
  getMessagesBySentAt,
  getExpiredMessages,
  getOutgoingWithoutExpiresAt,
  getNextExpiringMessage,

  // Unprocessed messages data
  getUnprocessedCount,
  getAllUnprocessed,
  getUnprocessedById,
  saveUnprocessed,
  updateUnprocessedAttempts,
  updateUnprocessedWithData,
  removeUnprocessed,
  removeAllUnprocessed,

  // attachments download jobs
  getNextAttachmentDownloadJobs,
  saveAttachmentDownloadJob,
  setAttachmentDownloadJobPending,
  resetAttachmentDownloadPending,
  removeAttachmentDownloadJob,
  removeAllAttachmentDownloadJobs,
  removeAll,
  removeAllConversations,
  cleanupOrphanedAttachments,
  removeOtherData,
  getMessagesWithVisualMediaAttachments,
  getMessagesWithFileAttachments,
  getSnodePoolFromDb,
  updateSnodePoolOnDb,
};
