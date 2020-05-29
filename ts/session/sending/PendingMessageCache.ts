import { RawMessage } from '../types/RawMessage';
import { ContentMessage } from '../messages/outgoing';
import { MessageUtils } from '../utils';

// TODO: We should be able to import functions straight from the db here without going through the window object


// This is an abstraction for storing pending messages.
// Ideally we want to store pending messages in the database so that
// on next launch we can re-send the pending messages, but we don't want
// to constantly fetch pending messages from the database.
// Thus we have an intermediary cache which will store pending messagesin
// memory and sync its state with the database on modification (add or remove).

export class PendingMessageCache {
  private cachedMessages: Array<RawMessage> = [];

  constructor() {
    // Load pending messages from the database
    this.load();
  }

  public add(
    device: string,
    message: ContentMessage
  ): RawMessage {
    // TODO: Maybe have a util for converting ContentMessage to RawMessage?
    // TODO: Raw message has uuid, how are we going to set that? maybe use a different identifier?
    // One could be device + timestamp would make a unique identifier
    
    const rawMessage = MessageUtils.toRawMessage(device, message);

    // Does it exist in cache already?
    if(this.find(rawMessage)) {
      return rawMessage;
    }

    this.cachedMessages.push(rawMessage);
    this.syncCacheWithDB();

    return rawMessage;
  }

  public find(message: RawMessage): RawMessage | undefined {
    // Find a message from the cache
    if (this.cachedMessages.find(m => m.device === message.device && m.timestamp === message.timestamp)) {
      return message;
    }

    return;
  }

  public remove(message: RawMessage): Array<RawMessage> | undefined {
    // Should only be called after message is processed

    // Return if message doesn't exist in cache
    if (!this.find(message)) {
      return;
    }

    // Rewrite cache with message removed
    const updatedCache = this.cachedMessages.filter(m => m.identifier !== message.identifier);
    this.cachedMessages = updatedCache;
    this.syncCacheWithDB();

    return updatedCache;
  }

  public getDevices(): Array<String> {
    // Gets all devices with pending messages
    return [...new Set(this.cachedMessages.map(m => m.device))];
  }

  public async getFromStorage(): Promise<Array<RawMessage>> {
    // tslint:disable-next-line: no-backbone-get-set-outside-model
    const pendingMessagesJSON = await window.storage.get('pendingMessages');

    // tslint:disable-next-line: no-unnecessary-local-variable
    const encodedPendingMessages = pendingMessagesJSON
      ? JSON.parse(pendingMessagesJSON)
      : [];
    
    // Set encryption type
    


    // TODO:
    //    Construct encryption key to match EncryptionType
    //    Build up Uint8Array from painTextBuffer in JSON
    return encodedPendingMessages;
  }

  public getForDevice(device: string): Array<RawMessage> {
    // TODO: Any cases in which this will break?
    return this.cachedMessages.filter(m => m.device === device);
  }

  private async load() {
    const messages = await this.getFromStorage();
    this.cachedMessages = messages;
  }

  private syncCacheWithDB() {
    // Only call when adding / removing from cache.
    const encodedPendingMessages = JSON.stringify(this.cachedMessages) || '';
    window.storage.put('pendingMessages', encodedPendingMessages);

    // TOOD: Is there any way this can fail? If so, make it return Boolean to catch
  }
}
