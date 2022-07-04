import { AbortSignal } from 'abort-controller';
import { APPLICATION_JSON } from '../../../../types/MIME';
import { sendJsonViaOnionV4ToNonSnode } from '../../../onions/onionSend';
import { UserUtils } from '../../../utils';
import { OpenGroupCapabilityRequest } from '../opengroupV2/ApiUtil';
import { parseStatusCodeFromOnionRequestV4 } from '../opengroupV2/OpenGroupAPIV2Parser';
import { OpenGroupMessageV2 } from '../opengroupV2/OpenGroupMessageV2';
import {
  getAllValidRoomInfos,
  OpenGroupRequestHeaders,
} from '../opengroupV2/OpenGroupPollingUtils';

export function addJsonContentTypeToHeaders(
  headers: OpenGroupRequestHeaders
): OpenGroupRequestHeaders {
  return { ...headers, 'Content-Type': APPLICATION_JSON };
}

export type OpenGroupSendMessageRequest = OpenGroupCapabilityRequest & {
  blinded: boolean;
};

export const sendSogsMessageOnionV4 = async (
  serverUrl: string,
  room: string,
  abortSignal: AbortSignal,
  message: OpenGroupMessageV2,
  blinded: boolean
): Promise<OpenGroupMessageV2> => {
  const allValidRoomInfos = await getAllValidRoomInfos(serverUrl, new Set([room]));
  if (!allValidRoomInfos?.length) {
    window?.log?.info('getSendMessageRequest: no valid roominfos got.');
    throw new Error(`Could not find sogs pubkey of url:${serverUrl}`);
  }
  const endpoint = `/room/${room}/message`;
  const method = 'POST';
  const serverPubkey = allValidRoomInfos[0].serverPublicKey;
  const ourKeyPair = await UserUtils.getIdentityKeyPair();

  // if we are sending a blinded message, we have to sign it with the derived keypair
  // otherwise, we just sign it with our real keypair
  const signedMessage = blinded
    ? await message.signWithBlinding(serverPubkey)
    : await message.sign(ourKeyPair);
  const json = signedMessage.toJson();
  const stringifiedBody = JSON.stringify(json);

  const res = await sendJsonViaOnionV4ToNonSnode({
    serverUrl,
    endpoint,
    serverPubkey,
    method,
    abortSignal,
    blinded,
    stringifiedBody,
    headers: null,
  });
  const statusCode = parseStatusCodeFromOnionRequestV4(res);
  if (!statusCode) {
    window?.log?.warn('sendSogsMessageWithOnionV4 Got unknown status code; res:', res);
    throw new Error(`sendSogsMessageOnionV4: invalid status code: ${statusCode}`);
  }

  if (statusCode !== 201) {
    throw new Error(`Could not postMessage, status code: ${statusCode}`);
  }

  if (!res) {
    throw new Error('Could not postMessage, res is invalid');
  }
  const rawMessage = res.body as Record<string, any>;
  if (!rawMessage) {
    throw new Error('postMessage parsing failed');
  }

  const toParse = {
    data: rawMessage.data,
    server_id: rawMessage.id,
    public_key: rawMessage.session_id,
    timestamp: rawMessage.posted,
    signature: rawMessage.signature,
  };

  // this will throw if the json is not valid
  const parsed = OpenGroupMessageV2.fromJson(toParse);
  return parsed;
};

export const sendMessageOnionV4BlindedRequest = async (
  serverUrl: string,
  room: string,
  abortSignal: AbortSignal,
  message: OpenGroupMessageV2,
  recipientBlindedId: string
): Promise<{ serverId: number; serverTimestamp: number }> => {
  const allValidRoomInfos = await getAllValidRoomInfos(serverUrl, new Set([room]));
  if (!allValidRoomInfos?.length) {
    window?.log?.info('getSendMessageRequest: no valid roominfos got.');
    throw new Error(`Could not find sogs pubkey of url:${serverUrl}`);
  }
  const endpoint = `/inbox/${recipientBlindedId}`;
  const method = 'POST';
  const serverPubkey = allValidRoomInfos[0].serverPublicKey;

  // if we are sending a blinded message, we have to sign it with the derived keypair
  // otherwise, we just sign it with our real keypair
  const signedMessage = await message.signWithBlinding(serverPubkey);
  const json = signedMessage.toBLindedMessageRequestJson();
  const stringifiedBody = JSON.stringify(json);

  const res = await sendJsonViaOnionV4ToNonSnode({
    serverUrl,
    endpoint,
    serverPubkey,
    method,
    abortSignal,
    blinded: true,
    stringifiedBody,
    headers: null,
  });
  const statusCode = parseStatusCodeFromOnionRequestV4(res);
  if (!statusCode) {
    window?.log?.warn('sendMessageOnionV4BlindedRequest Got unknown status code; res:', res);
    throw new Error(`sendMessageOnionV4BlindedRequest: invalid status code: ${statusCode}`);
  }

  if (statusCode !== 201) {
    throw new Error(`Could not postMessage, status code: ${statusCode}`);
  }

  if (!res) {
    throw new Error('Could not postMessage, res is invalid');
  }
  const rawMessage = res.body as Record<string, any>;
  if (!rawMessage) {
    throw new Error('postMessage parsing failed');
  }

  const serverId = rawMessage.id as number | undefined;
  const serverTimestamp = rawMessage.posted_at as number | undefined;
  if (!serverTimestamp || serverId === undefined) {
    window.log.warn('Could not blinded message request, server returned invalid data:', rawMessage);
    throw new Error('Could not blinded message request, server returned invalid data');
  }

  return { serverId, serverTimestamp: serverTimestamp * 1000 }; //timestamp are now returned with a seconds.ms syntax
};