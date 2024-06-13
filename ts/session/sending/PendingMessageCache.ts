import { from_hex, to_hex } from 'libsodium-wrappers-sumo';
import _, { compact, isNumber } from 'lodash';
import { Data } from '../../data/data';
import { Storage } from '../../util/storage';
import { SnodeNamespaces } from '../apis/snode_api/namespaces';
import { ContentMessage } from '../messages/outgoing';
import { PubKey } from '../types';
import { OutgoingRawMessage, StoredRawMessage } from '../types/RawMessage';
import { MessageUtils } from '../utils';

// This is an abstraction for storing pending messages.
// Ideally we want to store pending messages in the database so that
// on next launch we can re-send the pending messages, but we don't want
// to constantly fetch pending messages from the database.
// Thus we have an intermediary cache which will store pending messagesin
// memory and sync its state with the database on modification (add or remove).

export class PendingMessageCache {
  public callbacks: Map<string, (message: OutgoingRawMessage) => Promise<void>> = new Map();

  protected loadPromise: Promise<void> | undefined;
  protected cache: Array<OutgoingRawMessage> = [];

  public async getAllPending(): Promise<Array<OutgoingRawMessage>> {
    await this.loadFromDBIfNeeded();
    // Get all pending from cache
    return [...this.cache];
  }

  public async getForDevice(device: PubKey): Promise<Array<OutgoingRawMessage>> {
    const pending = await this.getAllPending();
    return pending.filter(m => m.device === device.key);
  }

  public async getDevices(): Promise<Array<PubKey>> {
    await this.loadFromDBIfNeeded();

    // Gets all unique devices with pending messages
    const pubkeyStrings = _.uniq(this.cache.map(m => m.device));

    return pubkeyStrings.map(PubKey.from).filter((k): k is PubKey => !!k);
  }

  public async add(
    destinationPubKey: PubKey,
    message: ContentMessage,
    namespace: SnodeNamespaces,
    sentCb?: (message: any) => Promise<void>,
    isGroup = false
  ): Promise<OutgoingRawMessage> {
    await this.loadFromDBIfNeeded();
    const rawMessage = await MessageUtils.toRawMessage(
      destinationPubKey,
      message,
      namespace,
      isGroup
    );

    // Does it exist in cache already?
    if (this.find(rawMessage)) {
      return rawMessage;
    }

    this.cache.push(rawMessage);
    if (sentCb) {
      this.callbacks.set(rawMessage.identifier, sentCb);
    }
    await this.saveToDB();

    return rawMessage;
  }

  public async remove(message: OutgoingRawMessage): Promise<Array<OutgoingRawMessage> | undefined> {
    await this.loadFromDBIfNeeded();
    // Should only be called after message is processed

    // Return if message doesn't exist in cache
    if (!this.find(message)) {
      return undefined;
    }

    // Remove item from cache and sync with database
    const updatedCache = this.cache.filter(
      cached => !(cached.device === message.device && cached.identifier === message.identifier)
    );
    this.cache = updatedCache;
    this.callbacks.delete(message.identifier);
    await this.saveToDB();

    return updatedCache;
  }

  public find(message: OutgoingRawMessage): OutgoingRawMessage | undefined {
    // Find a message in the cache
    return this.cache.find(m => m.device === message.device && m.identifier === message.identifier);
  }

  public async clear() {
    // Clears the cache and syncs to DB
    this.cache = [];
    this.callbacks = new Map();
    await this.saveToDB();
  }

  protected async loadFromDBIfNeeded() {
    if (!this.loadPromise) {
      this.loadPromise = this.loadFromDB();
    }

    await this.loadPromise;
  }

  protected async loadFromDB() {
    const messages = await this.getFromStorage();
    this.cache = messages;
  }

  protected async getFromStorage(): Promise<Array<OutgoingRawMessage>> {
    const data = await Data.getItemById('pendingMessages');
    if (!data || !data.value) {
      return [];
    }

    try {
      // let's do some cleanup, read what we have in DB, remove what is invalid, write to DB, and return filtered data.
      // this is because we've added some mandatory fields recently, and the current stored messages won't have them.
      const barePending = JSON.parse(String(data.value)) as Array<StoredRawMessage>;

      const filtered = compact(
        barePending.map((message: StoredRawMessage) => {
          try {
            // let's skip outgoing messages which have no networkTimestamp associated with them, as we need one to send a message (mapped to the envelope one)

            if (
              !message.networkTimestampCreated ||
              !isNumber(message.networkTimestampCreated) ||
              message.networkTimestampCreated <= 0
            ) {
              throw new Error('networkTimestampCreated is empty <=0');
            }

            const plainTextBuffer = from_hex(message.plainTextBufferHex); // if a plaintextBufferHex is unset or not hex, this throws and we remove that message entirely
            return {
              ...message,
              plainTextBuffer,
            } as OutgoingRawMessage;
          } catch (e) {
            window.log.warn('failed to decode from message cache:', e.message);
            return null;
          }

          // let's also remove that logic with the plaintextbuffer stored as array of numbers, and use base64 strings instead
        })
      );
      await this.saveToDBWithData(filtered);
      return filtered;
    } catch (e) {
      window.log.warn('getFromStorage failed with', e.message);
      return [];
    }
  }

  private async saveToDBWithData(msg: Array<OutgoingRawMessage>) {
    // For each plainTextBuffer in cache, save it as hex (because Uint8Array are not serializable as is)
    const encodedCache = msg.map(item => {
      return { ...item, plainTextBufferHex: to_hex(item.plainTextBuffer) };
    });

    const encodedPendingMessages = JSON.stringify(encodedCache) || '[]';
    await Storage.put('pendingMessages', encodedPendingMessages);
  }

  protected async saveToDB() {
    await this.saveToDBWithData(this.cache);
  }
}
