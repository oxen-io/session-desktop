import { RawMessage } from '../types/RawMessage';
import { ContentMessage } from '../messages/outgoing';

import { storage } from '../../window';

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
    // TODO: We should load pending messages from db here
    this.cachedMessages = this.getPendingMessages();
  }

  public addPendingMessage(
    device: string,
    message: ContentMessage
  ): RawMessage {
    // TODO: Maybe have a util for converting OutgoingContentMessage to RawMessage?
    // TODO: Raw message has uuid, how are we going to set that? maybe use a different identifier?
    // One could be device + timestamp would make a unique identifier
    // TODO: Return previous pending message if it exists
    return {} as RawMessage;
  }

  public removePendingMessage(message: RawMessage) {
    // TODO: implement
  }

  public getPendingDevices(): Array<String> {
    // TODO: this should return all devices which have pending messages
    return [];
  }

  public async getPendingMessages(): Promise<Array<RawMessage>> {
    // tslint:disable-next-line: no-backbone-get-set-outside-model
    const encodedPendingMessages = storage.get('pendingMessages');

    // tslint:disable-next-line: no-unnecessary-local-variable
    const pendingMessages = encodedPendingMessages
      ? JSON.parse(encodedPendingMessages)
      : [];

    return pendingMessages;
  }

  public getPendingMessagesForDevice(device: string): Array<RawMessage> {
    return [];
  }

  private syncPendingMessages() {
    // Sync cache with db
    return;
  }
}
