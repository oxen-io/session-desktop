import { OutgoingRawMessage } from '../types/RawMessage';

import { SignalService } from '../../protobuf';
import { SnodeNamespaces } from '../apis/snode_api/namespaces';
import { ContentMessage } from '../messages/outgoing';
import { ExpirationTimerUpdateMessage } from '../messages/outgoing/controlMessage/ExpirationTimerUpdateMessage';
import { ClosedGroupEncryptionPairReplyMessage } from '../messages/outgoing/controlMessage/group/ClosedGroupEncryptionPairReplyMessage';
import { ClosedGroupMessage } from '../messages/outgoing/controlMessage/group/ClosedGroupMessage';
import { ClosedGroupNewMessage } from '../messages/outgoing/controlMessage/group/ClosedGroupNewMessage';
import { PubKey } from '../types';

function getEncryptionTypeFromMessageType(
  message: ContentMessage,
  isGroup = false
): SignalService.Envelope.Type {
  // ClosedGroupNewMessage is sent using established channels, so using fallback
  if (
    message instanceof ClosedGroupNewMessage ||
    message instanceof ClosedGroupEncryptionPairReplyMessage
  ) {
    return SignalService.Envelope.Type.SESSION_MESSAGE;
  }

  // 1. any ClosedGroupMessage which is not a ClosedGroupNewMessage must be encoded with ClosedGroup
  // 2. if TypingMessage or ExpirationTimer and groupId is set => must be encoded with ClosedGroup too
  if (
    message instanceof ClosedGroupMessage ||
    (message instanceof ExpirationTimerUpdateMessage && message.groupId) ||
    isGroup
  ) {
    return SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE;
  }
  return SignalService.Envelope.Type.SESSION_MESSAGE;
}

export async function toRawMessage(
  destinationPubKey: PubKey,
  message: ContentMessage,
  namespace: SnodeNamespaces,
  isGroup = false
): Promise<OutgoingRawMessage> {
  const ttl = message.ttl();
  const plainTextBuffer = message.plainTextBuffer();

  const encryption = getEncryptionTypeFromMessageType(message, isGroup);

  const rawMessage: OutgoingRawMessage = {
    identifier: message.identifier,
    plainTextBuffer,
    device: destinationPubKey.key,
    ttl,
    encryption,
    namespace,
    networkTimestampCreated: message.createAtNetworkTimestamp,
  };

  return rawMessage;
}
