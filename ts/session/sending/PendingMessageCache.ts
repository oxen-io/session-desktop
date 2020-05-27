import { RawMessage } from '../types/RawMessage';
import { ContentMessage } from '../messages/outgoing';
import { EncryptionType } from '../types/EncryptionType';

import { storage } from '../../window';
import { createOrUpdatePairingAuthorisation } from '../../../js/modules/data';

// TODO: We should be able to import functions straight from the db here without going through the window object


// This is an abstraction for storing pending messages.
// Ideally we want to store pending messages in the database so that
// on next launch we can re-send the pending messages, but we don't want
// to constantly fetch pending messages from the database.
// Thus we have an intermediary cache which will store pending messagesin
// memory and sync its state with the database on modification (add or remove).

export class PendingMessageCache {
  private readonly cachedMessages: Array<RawMessage> = [];

  constructor() {
    // Load pending messages from the database
    this.getPendingMessagesFromStorage().then(messages => {
      this.cachedMessages.push(...messages);

      console.log('[vince] this.cachedMessages:', this.cachedMessages);
    }).catch();
    
  }

  public addPendingMessage(
    device: string,
    message: ContentMessage
  ): RawMessage {
    // TODO: Maybe have a util for converting ContentMessage to RawMessage?
    // TODO: Raw message has uuid, how are we going to set that? maybe use a different identifier?
    // One could be device + timestamp would make a unique identifier
    // TODO: Return previous pending message if it exists
    
    const rawMessage = this.toRawMessage(device, message);

    const pendingForDevice = this.getPendingMessagesForDevice(device);
    const previousPendingMessage = pendingForDevice.length
      // TODO; ensure this is the most recent message with timestamp
      ? pendingForDevice[0]
      : {} as RawMessage;

    // Does it exist in cache already?
    if (this.cachedMessages.find(m => m.identifier === rawMessage.identifier)) {
      return previousPendingMessage;
    }

    this.cachedMessages.push(rawMessage);
    this.syncCacheWithDB();

    return previousPendingMessage;
  }

  public removePendingMessage(message: RawMessage): Boolean {
    // Return false if message doesn't exist in cache
    if (this.cachedMessages.find(m => m.identifier === message.identifier)) {
      return false;
    }

    // Rewrite cache with message removed
    const updatedCache = this.cachedMessages.filter(m => m.identifier !== message.identifier);
    this.cachedMessages.length = 0;
    this.cachedMessages.push(...updatedCache);

    this.syncCacheWithDB();

    return true;
  }

  public removePendingMessageByIdentifier(identifier: string) {
    return;
  }

  public getPendingDevices(): Array<String> {
    // TODO: this should return all devices which have pending messages
    return [];
  }

  public async getPendingMessagesFromStorage(): Promise<Array<RawMessage>> {
    // tslint:disable-next-line: no-backbone-get-set-outside-model
    const encodedPendingMessages = await window.storage.get('pendingMessages');

    // tslint:disable-next-line: no-unnecessary-local-variable
    const pendingMessages = encodedPendingMessages
      ? JSON.parse(encodedPendingMessages)
      : [];

    return pendingMessages;
  }

  public getPendingMessagesForDevice(device: string): Array<RawMessage> {
    const cachedMessages = this.cachedMessages;

    cachedMessages


    return [];
  }

  public toRawMessage(device: string, message: ContentMessage): RawMessage {
    // const plainTextBuffer = new Uint8Array();
    const timestamp = message.ttl();
    const plainTextBuffer = message.plainTextBuffer();

    // tslint:disable-next-line: no-unnecessary-local-variable
    const rawMessage: RawMessage = {
      identifier: 'dfgdrgsdf',
      plainTextBuffer,
      timestamp,
      device,
      ttl: 345345345,
      encryption: EncryptionType.Signal,
    };

    return rawMessage;
  }

  private async syncCacheWithDB() {
    // Only call when adding / removing from cache.
    const encodedPendingMessages = JSON.stringify(this.cachedMessages) || '';
    await window.storage.put('pendingMessages', encodedPendingMessages);

    // testing
    // tslint:disable-next-line: no-backbone-get-set-outside-model
    const db = await window.storage.get('pendingMessages');
    console.log('[vince] Updated storage:', db);

    // TOOD: Is there any way this can fail? If so, make it return Boolean to catch
  }
}
