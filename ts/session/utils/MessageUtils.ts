import { RawMessage } from '../types/RawMessage';
import { ContentMessage } from '../messages/outgoing';
import { EncryptionType } from '../types/EncryptionType';

export const MessageUtils = {
  toRawMessage,
};

function toRawMessage(device: string, message: ContentMessage): RawMessage {
  // const plainTextBuffer = new Uint8Array();
  const ttl = message.ttl();
  const timestamp = message.timestamp;
  const plainTextBuffer = message.plainTextBuffer();

  // tslint:disable-next-line: no-unnecessary-local-variable
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
