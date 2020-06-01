import { RawMessage } from '../types/RawMessage';
import { ContentMessage } from '../messages/outgoing';
import { EncryptionType } from '../types/EncryptionType';



function toRawMessage(device: string, message: ContentMessage): RawMessage {
  const ttl = message.ttl();
  const timestamp = message.timestamp;
  const plainTextBuffer = message.plainTextBuffer();

  // Get EncryptionType depending on message type.
  // let encryption: EncryptionType;
  
  // switch (message.constructor.name) {
  //   case MessageType.Chat:
  //     encryption = EncryptionType.Signal;
  //     break;
  //   case MessageType.SessionReset:
  //     encryption = EncryptionType
  // }

  // export enum EncryptionType {
  //   Signal,
  //   SessionReset,
  //   MediumGroup,
  // }

  const rawMessage: RawMessage = {
    identifier: message.identifier,
    plainTextBuffer,
    timestamp,
    device,
    ttl,
    encryption: EncryptionType.Signal,
  };

  return rawMessage;
}


export enum PubKeyType {
  Primary = 'priamry',
  Secondary = 'secondary',
  Group = 'group',
}

export class PubKey {
  public readonly key: string;
  public type?: PubKeyType

  private static readonly regex: string = '^0[0-9a-fA-F]{65}$';

  constructor(pubkeyString: string, type: PubKeyType | undefined = undefined) {
    PubKey.validate(pubkeyString);
    this.key = pubkeyString;
    this.type = type;
  }

  public static from(pubkeyString: string): PubKey | undefined {
    // Returns a new instance if the pubkey is valid
    if (PubKey.validate(pubkeyString)) {
      return new PubKey(pubkeyString);
    }

    return;
  }

  public static validate(pubkeyString: string): boolean | undefined {
    if (pubkeyString.match(PubKey.regex)) {
      return true;
    }

    throw new Error('Invalid pubkey format');
  }
}

// Functions / Tools
export const MessageUtils = {
  toRawMessage,
};