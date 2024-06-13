import { v4 as uuid } from 'uuid';

export interface MessageParams {
  createAtNetworkTimestamp: number;
  identifier?: string;
}

export abstract class Message {
  /**
   * This is the network timestamp when this message was created (and so, potentially signed).
   * This must be used as the envelope timestamp, as other devices are going to use it to verify messages.
   * There is also the stored_at/effectiveTimestamp which we get back once we sent a message to the recipient's swarm, but that's not included here.
   */
  public readonly createAtNetworkTimestamp: number;
  public readonly identifier: string;

  constructor({ createAtNetworkTimestamp, identifier }: MessageParams) {
    this.createAtNetworkTimestamp = createAtNetworkTimestamp;
    if (identifier && identifier.length === 0) {
      throw new Error('Cannot set empty identifier');
    }

    if (!createAtNetworkTimestamp || createAtNetworkTimestamp <= 0) {
      throw new Error('Cannot set undefined createAtNetworkTimestamp or <=0');
    }
    this.identifier = identifier || uuid();
  }
}
