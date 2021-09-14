// REMOVE COMMENT AFTER: This can just export pure functions as it doesn't need state

import { RawMessage } from '../types/RawMessage';
import { SignalService } from '../../protobuf';
import { MessageEncrypter } from '../crypto';
import pRetry from 'p-retry';
import { PubKey } from '../types';
import { UserUtils } from '../utils';
import { OpenGroupRequestCommonType } from '../../opengroup/opengroupV2/ApiUtil';
import { postMessage } from '../../opengroup/opengroupV2/OpenGroupAPIV2';
import { OpenGroupMessageV2 } from '../../opengroup/opengroupV2/OpenGroupMessageV2';
import { fromUInt8ArrayToBase64 } from '../utils/String';
import { OpenGroupVisibleMessage } from '../messages/outgoing/visibleMessage/OpenGroupVisibleMessage';
import { addMessagePadding } from '../crypto/BufferPadding';
import _ from 'lodash';
import { getLatestTimestampOffset, storeOnNode } from '../snode_api/SNodeAPI';
import { getSwarmFor } from '../snode_api/snodePool';
import { firstTrue } from '../utils/Promise';
const DEFAULT_CONNECTIONS = 3;

// ================ SNODE STORE ================

/**
 * Send a message via service nodes.
 *
 * @param message The message to send.
 * @param attempts The amount of times to attempt sending. Minimum value is 1.
 */
export async function send(
  message: RawMessage,
  attempts: number = 3,
  retryMinTimeout?: number // in ms
): Promise<Uint8Array> {
  return pRetry(
    async () => {
      const device = PubKey.cast(message.device);
      const diffTimestamp = Date.now() - getLatestTimestampOffset();

      const { plainTextBuffer, encryption, ttl } = message;
      const contentDecoded = SignalService.Content.decode(plainTextBuffer);
      const { dataMessage } = contentDecoded;
      if (dataMessage && dataMessage.timestamp && dataMessage.timestamp > 0) {
      }
      const { envelopeType, cipherText } = await MessageEncrypter.encrypt(
        device,
        plainTextBuffer,
        encryption
      );
      const envelope = await buildEnvelope(envelopeType, device.key, diffTimestamp, cipherText);

      const data = wrapEnvelope(envelope);
      await exports.TEST_sendMessageToSnode(device.key, data, ttl, diffTimestamp);
      return data;
    },
    {
      retries: Math.max(attempts - 1, 0),
      factor: 1,
      minTimeout: retryMinTimeout || 1000,
    }
  );
}

export async function TEST_sendMessageToSnode(
  pubKey: string,
  data: Uint8Array,
  ttl: number,
  timestamp: number
): Promise<void> {
  const data64 = window.dcodeIO.ByteBuffer.wrap(data).toString('base64');
  const swarm = await getSwarmFor(pubKey);

  window?.log?.debug('Sending envelope with timestamp: ', timestamp, ' to ', pubKey);
  // send parameters
  const params = {
    pubKey,
    ttl: `${ttl}`,
    timestamp: `${timestamp}`,
    data: data64,
  };

  const usedNodes = _.slice(swarm, 0, DEFAULT_CONNECTIONS);

  const promises = usedNodes.map(async usedNode => {
    // TODO: Revert back to using snode address instead of IP
    // No pRetry here as if this is a bad path it will be handled and retried in lokiOnionFetch.
    // the only case we could care about a retry would be when the usedNode is not correct,
    // but considering we trigger this request with a few snode in //, this should be fine.
    const successfulSend = await storeOnNode(usedNode, params);
    if (successfulSend) {
      return usedNode;
    }
    // should we mark snode as bad if it can't store our message?
    return undefined;
  });

  let snode;
  try {
    snode = await firstTrue(promises);
  } catch (e) {
    const snodeStr = snode ? `${snode.ip}:${snode.port}` : 'null';
    window?.log?.warn(
      `loki_message:::sendMessage - ${e.code} ${e.message} to ${pubKey} via snode:${snodeStr}`
    );
    throw e;
  }
  if (!usedNodes || usedNodes.length === 0) {
    throw new window.textsecure.EmptySwarmError(pubKey, 'Ran out of swarm nodes to query');
  }

  window?.log?.info(
    `loki_message:::sendMessage - Successfully stored message to ${pubKey} via ${snode.ip}:${snode.port}`
  );
}

async function buildEnvelope(
  type: SignalService.Envelope.Type,
  sskSource: string | undefined,
  timestamp: number,
  content: Uint8Array
): Promise<SignalService.Envelope> {
  let source: string | undefined;

  if (type === SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE) {
    source = sskSource;
  }

  return SignalService.Envelope.create({
    type,
    source,
    timestamp,
    content,
  });
}

/**
 * This is an outdated practice and we should probably just send the envelope data directly.
 * Something to think about in the future.
 */
function wrapEnvelope(envelope: SignalService.Envelope): Uint8Array {
  const request = SignalService.WebSocketRequestMessage.create({
    id: 0,
    body: SignalService.Envelope.encode(envelope).finish(),
    verb: 'PUT',
    path: '/api/v1/message',
  });

  const websocket = SignalService.WebSocketMessage.create({
    type: SignalService.WebSocketMessage.Type.REQUEST,
    request,
  });
  return SignalService.WebSocketMessage.encode(websocket).finish();
}

// ================ Open Group ================
/**
 * Send a message to an open group v2.
 * @param message The open group message.
 */
export async function sendToOpenGroupV2(
  rawMessage: OpenGroupVisibleMessage,
  roomInfos: OpenGroupRequestCommonType
): Promise<OpenGroupMessageV2> {
  // we agreed to pad message for opengroupv2
  const paddedBody = addMessagePadding(rawMessage.plainTextBuffer());
  const v2Message = new OpenGroupMessageV2({
    sentTimestamp: Date.now(),
    sender: UserUtils.getOurPubKeyStrFromCache(),
    base64EncodedData: fromUInt8ArrayToBase64(paddedBody),
    // the signature is added in the postMessage())
  });

  // Warning: postMessage throws
  const sentMessage = await postMessage(v2Message, roomInfos);
  return sentMessage;
}
