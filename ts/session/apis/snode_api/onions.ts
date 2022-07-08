import { default as insecureNodeFetch, RequestInit, Response } from 'node-fetch';
import https from 'https';

import { dropSnodeFromSnodePool, dropSnodeFromSwarmIfNeeded, updateSwarmFor } from './snodePool';
import ByteBuffer from 'bytebuffer';
import { OnionPaths } from '../../onions';
import { toHex } from '../../utils/String';
import pRetry from 'p-retry';
import { ed25519Str, incrementBadPathCountOrDrop } from '../../onions/onionPath';
import _, { cloneDeep, isString, omit } from 'lodash';
// hold the ed25519 key of a snode against the time it fails. Used to remove a snode only after a few failures (snodeFailureThreshold failures)
let snodeFailureCount: Record<string, number> = {};

import { Snode } from '../../../data/data';
import { ERROR_CODE_NO_CONNECT } from './SNodeAPI';
import { Onions } from '.';
import { hrefPnServerProd } from '../push_notification_api/PnServer';
import { callUtilsWorker } from '../../../webworker/workers/util_worker_interface';
import { encodeV4Request } from '../../onions/onionv4';
import { AbortSignal } from 'abort-controller';

export const resetSnodeFailureCount = () => {
  snodeFailureCount = {};
};

// The number of times a snode can fail before it's replaced.
const snodeFailureThreshold = 3;

export const OXEN_SERVER_ERROR = 'Oxen Server error';
/**
 * When sending a request over onion, we might get two status.
 * The first one, on the request itself, the other one in the json returned.
 *
 * If the request failed to reach the one of the node of the onion path, the one on the request is set.
 * But if the request reaches the destination node and it fails to process the request (bad node for this pubkey), you will get a 200 on the request itself, but the json you get will contain the real status.
 */
export interface SnodeResponse {
  bodyBinary: Uint8Array | null;
  body: string;
  status?: number;
}

// v4 onion request have a weird string and binary content, so better get it as binary to extract just the string part
export interface SnodeResponseV4 {
  bodyBinary: Uint8Array | null;
  status?: number;
}

export const NEXT_NODE_NOT_FOUND_PREFIX = 'Next node not found: ';
export const ERROR_421_HANDLED_RETRY_REQUEST =
  '421 handled. Retry this request with a new targetNode';

export const CLOCK_OUT_OF_SYNC_MESSAGE_ERROR =
  'Your clock is out of sync with the network. Check your clock.';

export type EncodeV4OnionRequestInfos = {
  headers: Record<string, any> | null | undefined;
  body?: string | Uint8Array | null;
  method: string;
  endpoint: string;
};

async function encryptOnionV4RequestForPubkey(
  pubKeyX25519hex: string,
  requestInfo: EncodeV4OnionRequestInfos
) {
  const plaintext = encodeV4Request(requestInfo);

  return callUtilsWorker('encryptForPubkey', pubKeyX25519hex, plaintext) as Promise<
    DestinationContext
  >;
}
// Returns the actual ciphertext, symmetric key that will be used
// for decryption, and an ephemeral_key to send to the next hop
async function encryptForPubKey(
  pubKeyX25519hex: string,
  requestInfo: any
): Promise<DestinationContext> {
  const plaintext = new TextEncoder().encode(JSON.stringify(requestInfo));

  return callUtilsWorker('encryptForPubkey', pubKeyX25519hex, plaintext) as Promise<
    DestinationContext
  >;
}

export type DestinationRelayV2 = {
  host?: string;
  protocol?: string;
  port?: number;
  destination?: string;
  method?: string;
  target?: string;
};

// `ctx` holds info used by `node` to relay further
async function encryptForRelayV2(
  relayX25519hex: string,
  destination: DestinationRelayV2,
  ctx: DestinationContext
) {
  if (!destination.host && !destination.destination) {
    window?.log?.warn('loki_rpc::encryptForRelayV2 - no destination', destination);
  }

  const reqObj = {
    ...destination,
    ephemeral_key: toHex(ctx.ephemeralKey),
  };

  const plaintext = encodeCiphertextPlusJson(ctx.ciphertext, reqObj);
  return callUtilsWorker('encryptForPubkey', relayX25519hex, plaintext);
}

/// Encode ciphertext as (len || binary) and append payloadJson as utf8
function encodeCiphertextPlusJson(
  ciphertext: Uint8Array,
  payloadJson: Record<string, any>
): Uint8Array {
  const payloadStr = JSON.stringify(payloadJson);

  const bufferJson = ByteBuffer.wrap(payloadStr, 'utf8');

  const len = ciphertext.length;
  const arrayLen = bufferJson.buffer.length + 4 + len;
  const littleEndian = true;
  const buffer = new ByteBuffer(arrayLen, littleEndian);

  buffer.writeInt32(len);
  buffer.append(ciphertext);
  buffer.append(bufferJson);

  return new Uint8Array(buffer.buffer);
}

async function buildOnionCtxs(
  nodePath: Array<Snode>,
  destCtx: DestinationContext,
  useV4: boolean,
  targetED25519Hex?: string,
  finalRelayOptions?: FinalRelayOptions
) {
  const ctxes = [destCtx];
  if (!nodePath) {
    throw new Error('buildOnionCtxs needs a valid path');
  }
  // from (3) 2 to 0
  const firstPos = nodePath.length - 1;

  for (let i = firstPos; i > -1; i -= 1) {
    let dest: DestinationRelayV2;
    const relayingToFinalDestination = i === firstPos; // if last position

    if (relayingToFinalDestination && finalRelayOptions) {
      const isCallToPn = finalRelayOptions?.host === hrefPnServerProd;
      const target = !isCallToPn && !useV4 ? '/loki/v3/lsrpc' : '/oxen/v4/lsrpc';

      dest = {
        host: finalRelayOptions.host,
        target,
        method: 'POST',
      };
      // tslint:disable-next-line: no-http-string
      if (finalRelayOptions?.protocol === 'http') {
        dest.protocol = finalRelayOptions.protocol;
        dest.port = finalRelayOptions.port || 80;
      }
    } else {
      // set x25519 if destination snode
      let pubkeyHex = targetED25519Hex; // relayingToFinalDestination
      // or ed25519 snode destination
      if (!relayingToFinalDestination) {
        pubkeyHex = nodePath[i + 1].pubkey_ed25519;
        if (!pubkeyHex) {
          window?.log?.error(
            'loki_rpc:::buildOnionGuardNodePayload - no ed25519 for',
            nodePath[i + 1],
            'path node',
            i + 1
          );
        }
      }
      // destination takes a hex key
      dest = {
        destination: pubkeyHex,
      };
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const ctx = await encryptForRelayV2(nodePath[i].pubkey_x25519, dest, ctxes[ctxes.length - 1]);
      ctxes.push(ctx);
    } catch (e) {
      window?.log?.error(
        'loki_rpc:::buildOnionGuardNodePayload - encryptForRelayV2 failure',
        e.code,
        e.message
      );
      throw e;
    }
  }

  return ctxes;
}

// we just need the targetNode.pubkey_ed25519 for the encryption
// targetPubKey is ed25519 if snode is the target
async function buildOnionGuardNodePayload(
  nodePath: Array<Snode>,
  destCtx: DestinationContext,
  useV4: boolean,
  targetED25519Hex?: string,
  finalRelayOptions?: FinalRelayOptions
) {
  const ctxes = await buildOnionCtxs(nodePath, destCtx, useV4, targetED25519Hex, finalRelayOptions);

  // this is the OUTER side of the onion, the one encoded with multiple layer
  // So the one we will send to the first guard node.
  const guardCtx = ctxes[ctxes.length - 1]; // last ctx

  // New "semi-binary" encoding

  const guardPayloadObj = {
    ephemeral_key: toHex(guardCtx.ephemeralKey),
  };

  return encodeCiphertextPlusJson(guardCtx.ciphertext, guardPayloadObj);
}

/**
 * 406 is a clock out of sync error
 */
function process406Error(statusCode: number) {
  if (statusCode === 406) {
    // clock out of sync
    // this will make the pRetry stop
    throw new pRetry.AbortError(CLOCK_OUT_OF_SYNC_MESSAGE_ERROR);
  }
}

function processOxenServerError(_statusCode: number, body?: string) {
  if (body === OXEN_SERVER_ERROR) {
    window?.log?.warn('[path] Got Oxen server Error. Not much to do if the server has troubles.');
    throw new pRetry.AbortError(OXEN_SERVER_ERROR);
  }
}

/**
 * 421 is a invalid swarm error
 */
async function process421Error(
  statusCode: number,
  body: string,
  associatedWith?: string,
  lsrpcEd25519Key?: string
) {
  if (statusCode === 421) {
    await handle421InvalidSwarm({
      snodeEd25519: lsrpcEd25519Key,
      body,
      associatedWith,
    });
  }
}

/**
 * Handle throwing errors for destination errors.
 * A destination can either be a server (like an opengroup server) in this case destinationEd25519 is unset or be a snode (for snode rpc calls) and destinationEd25519 is set in this case.
 *
 * If destinationEd25519 is set, we will increment the failure count of the specified snode
 */
async function processOnionRequestErrorAtDestination({
  statusCode,
  body,
  destinationEd25519,
  associatedWith,
}: {
  statusCode: number;
  body: string;
  destinationEd25519?: string;
  associatedWith?: string;
}) {
  if (statusCode === 200) {
    return;
  }
  window?.log?.info(
    `processOnionRequestErrorAtDestination. statusCode nok: ${statusCode}: "${body}"`
  );

  process406Error(statusCode);
  await process421Error(statusCode, body, associatedWith, destinationEd25519);
  processOxenServerError(statusCode, body);
  if (destinationEd25519) {
    await processAnyOtherErrorAtDestination(statusCode, body, destinationEd25519, associatedWith);
  }
}

async function handleNodeNotFound({
  ed25519NotFound,
  associatedWith,
}: {
  ed25519NotFound: string;
  associatedWith?: string;
}) {
  const shortNodeNotFound = ed25519Str(ed25519NotFound);
  window?.log?.warn('Handling NODE NOT FOUND with: ', shortNodeNotFound);

  if (associatedWith) {
    await dropSnodeFromSwarmIfNeeded(associatedWith, ed25519NotFound);
  }

  await dropSnodeFromSnodePool(ed25519NotFound);
  snodeFailureCount[ed25519NotFound] = 0;
  // try to remove the not found snode from any of the paths if it's there.
  // it may not be here, as the snode note found might be the target snode of the request.
  await OnionPaths.dropSnodeFromPath(ed25519NotFound);
}

async function processAnyOtherErrorOnPath(
  status: number,
  guardNodeEd25519: string,
  ciphertext?: string,
  associatedWith?: string
) {
  // this test checks for an error in your path.
  if (status !== 200) {
    window?.log?.warn(`[path] Got status: ${status}`);

    // If we have a specific node in fault we can exclude just this node.
    if (ciphertext?.startsWith(NEXT_NODE_NOT_FOUND_PREFIX)) {
      const nodeNotFound = ciphertext.substr(NEXT_NODE_NOT_FOUND_PREFIX.length);
      // we are checking errors on the path, a nodeNotFound on the path should trigger a rebuild

      await handleNodeNotFound({ ed25519NotFound: nodeNotFound, associatedWith });
    } else {
      // Otherwise we increment the whole path failure count

      await incrementBadPathCountOrDrop(guardNodeEd25519);
    }

    processOxenServerError(status, ciphertext);

    throw new Error(`Bad Path handled. Retry this request. Status: ${status}`);
  }
}

async function processAnyOtherErrorAtDestination(
  status: number,
  body: string,
  destinationEd25519: string,
  associatedWith?: string
) {
  // this test checks for error at the destination.
  if (
    status !== 400 &&
    status !== 406 && // handled in process406Error
    status !== 421 // handled in process421Error
  ) {
    window?.log?.warn(`[path] Got status at destination: ${status}`);

    if (body?.startsWith(NEXT_NODE_NOT_FOUND_PREFIX)) {
      const nodeNotFound = body.substr(NEXT_NODE_NOT_FOUND_PREFIX.length);
      // if we get a nodeNotFound at the destination. it means the targetNode to which we made the request is not found.
      await handleNodeNotFound({
        ed25519NotFound: nodeNotFound,
        associatedWith,
      });

      // We have to retry with another targetNode so it's not just rebuilding the path. We have to go one lever higher (lokiOnionFetch).
      // status is 502 for a node not found
      throw new pRetry.AbortError(
        `Bad Path handled. Retry this request with another targetNode. Status: ${status}`
      );
    }

    await Onions.incrementBadSnodeCountOrDrop({
      snodeEd25519: destinationEd25519,
      associatedWith,
    });

    throw new Error(`Bad Path handled. Retry this request. Status: ${status}`);
  }
}

async function processOnionRequestErrorOnPath(
  httpStatusCode: number, // this is the one on the response object, not inside the json response
  ciphertext: string,
  guardNodeEd25519: string,
  lsrpcEd25519Key?: string,
  associatedWith?: string
) {
  if (httpStatusCode !== 200) {
    window?.log?.warn('errorONpath:', ciphertext);
  }
  process406Error(httpStatusCode);
  await process421Error(httpStatusCode, ciphertext, associatedWith, lsrpcEd25519Key);
  await processAnyOtherErrorOnPath(httpStatusCode, guardNodeEd25519, ciphertext, associatedWith);
}

function processAbortedRequest(abortSignal?: AbortSignal) {
  if (abortSignal?.aborted) {
    window?.log?.warn('[path] Call aborted');
    // this will make the pRetry stop
    throw new pRetry.AbortError('Request got aborted');
  }
}

const debug = false;

/**
 * Only exported for testing purpose
 */
export async function decodeOnionResult(
  symmetricKey: ArrayBuffer,
  ciphertext: string
): Promise<{
  ciphertextBuffer: Uint8Array;
  plaintext: string;
  plaintextBuffer: ArrayBuffer;
}> {
  let parsedCiphertext = ciphertext;
  try {
    const jsonRes = JSON.parse(ciphertext);
    parsedCiphertext = jsonRes.result;
  } catch (e) {
    // just try to get a json object from what is inside (for PN requests), if it fails, continue ()
  }
  const ciphertextBuffer = await callUtilsWorker('fromBase64ToArrayBuffer', parsedCiphertext);

  const plaintextBuffer = (await callUtilsWorker(
    'DecryptAESGCM',
    new Uint8Array(symmetricKey),
    new Uint8Array(ciphertextBuffer)
  )) as ArrayBuffer;

  return {
    ciphertextBuffer,
    plaintext: new TextDecoder().decode(plaintextBuffer),
    plaintextBuffer,
  };
}

export const STATUS_NO_STATUS = 8888;
/**
 * Only exported for testing purpose
 */
export async function processOnionResponse({
  response,
  symmetricKey,
  guardNode,
  abortSignal,
  associatedWith,
  lsrpcEd25519Key,
}: {
  response?: { text: () => Promise<string>; status: number };
  symmetricKey?: ArrayBuffer;
  guardNode: Snode;
  lsrpcEd25519Key?: string;
  abortSignal?: AbortSignal;
  associatedWith?: string;
}): Promise<SnodeResponse> {
  let ciphertext = '';

  processAbortedRequest(abortSignal);

  try {
    ciphertext = (await response?.text()) || '';
  } catch (e) {
    window?.log?.warn(e);
  }

  await processOnionRequestErrorOnPath(
    response?.status || STATUS_NO_STATUS,
    ciphertext,
    guardNode.pubkey_ed25519,
    lsrpcEd25519Key,
    associatedWith
  );

  if (!ciphertext) {
    window?.log?.warn(
      '[path] sessionRpc::processingOnionResponse - Target node return empty ciphertext'
    );
    throw new Error('Target node return empty ciphertext');
  }

  let plaintext;
  let ciphertextBuffer;

  try {
    const decoded = await exports.decodeOnionResult(symmetricKey, ciphertext);

    plaintext = decoded.plaintext;
    ciphertextBuffer = decoded.ciphertextBuffer;
  } catch (e) {
    window?.log?.error('[path] sessionRpc::processingOnionResponse - decode error', e);
    if (symmetricKey) {
      window?.log?.error(
        '[path] sessionRpc::processingOnionResponse - symmetricKey',
        toHex(symmetricKey)
      );
    }
    if (ciphertextBuffer) {
      window?.log?.error(
        '[path] sessionRpc::processingOnionResponse - ciphertextBuffer',
        toHex(ciphertextBuffer)
      );
    }
    throw new Error('Ciphertext decode error');
  }

  if (debug) {
    window?.log?.debug('sessionRpc::processingOnionResponse - plaintext', plaintext);
  }

  try {
    const jsonRes = JSON.parse(plaintext, (_key, value) => {
      if (typeof value === 'number' && value > Number.MAX_SAFE_INTEGER) {
        window?.log?.warn('Received an out of bounds js number');
      }
      return value;
    }) as Record<string, any>;

    const status = jsonRes.status_code || jsonRes.status;

    await processOnionRequestErrorAtDestination({
      statusCode: status,
      body: jsonRes?.body, // this is really important. the `.body`. the .body should be a string. for isntance for nodeNotFound but is most likely a dict (Record<string,any>))
      destinationEd25519: lsrpcEd25519Key,
      associatedWith,
    });

    return jsonRes as SnodeResponse;
  } catch (e) {
    window?.log?.error(
      `[path] sessionRpc::processingOnionResponse - Rethrowing error ${e.message}'`
    );
    throw e;
  }
}

async function processOnionResponseV4({
  response,
  symmetricKey,
  abortSignal,
}: {
  response?: Response;
  symmetricKey?: ArrayBuffer;
  guardNode: Snode;
  lsrpcEd25519Key?: string;
  abortSignal?: AbortSignal;
  associatedWith?: string;
}): Promise<SnodeResponseV4 | undefined> {
  processAbortedRequest(abortSignal);

  if (!symmetricKey) {
    window?.log?.error('No symmetric key to decode response.');
    return undefined;
  }
  const cipherText = (await response?.arrayBuffer()) || [];

  const plaintextBuffer = await callUtilsWorker(
    'DecryptAESGCM',
    new Uint8Array(symmetricKey),
    new Uint8Array(cipherText)
  );

  const bodyBinary: Uint8Array = new Uint8Array(plaintextBuffer);

  return {
    bodyBinary,
  };
}

export const snodeHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * As far as I know, FinalRelayOptions is only used for contacting non service node. So PN server, opengroups, fileserver, etc.
 * It contains the details the last service node of the onion path needs to use to contact who we need to contact.
 * So things, like the ip/port and protocol of the opengroup server/fileserver/PN server.
 */
export type FinalRelayOptions = {
  host: string;
  protocol?: 'http' | 'https'; // default to https
  port?: number; // default to 443
};

export type DestinationContext = {
  ciphertext: Uint8Array;
  symmetricKey: ArrayBuffer;
  ephemeralKey: ArrayBuffer;
};

/**
 * Handle a 421. The body is supposed to be the new swarm nodes for this publickey.
 * @param snodeEd25519 the snode gaving the reply
 * @param body the new swarm not parsed. If an error happens while parsing this we will drop the snode.
 * @param associatedWith the specific publickey associated with this call
 */
async function handle421InvalidSwarm({
  body,
  snodeEd25519,
  associatedWith,
}: {
  body: string;
  snodeEd25519?: string;
  associatedWith?: string;
}) {
  if (!snodeEd25519 || !associatedWith) {
    // The snode isn't associated with the given public key anymore
    // this does not make much sense to have a 421 without a publicKey set.
    throw new Error('status 421 without a final destination or no associatedWith makes no sense');
  }
  window?.log?.info(`Invalidating swarm for ${ed25519Str(associatedWith)}`);

  try {
    const parsedBody = JSON.parse(body);

    // The snode isn't associated with the given public key anymore
    if (parsedBody?.snodes?.length) {
      // the snode gave us the new swarm. Save it for the next retry
      window?.log?.warn(
        'Wrong swarm, now looking at snodes',
        parsedBody.snodes.map((s: any) => ed25519Str(s.pubkey_ed25519))
      );

      await updateSwarmFor(associatedWith, parsedBody.snodes);
      throw new pRetry.AbortError(ERROR_421_HANDLED_RETRY_REQUEST);
    }
    // remove this node from the swarm of this pubkey
    await dropSnodeFromSwarmIfNeeded(associatedWith, snodeEd25519);
  } catch (e) {
    if (e.message !== ERROR_421_HANDLED_RETRY_REQUEST) {
      window?.log?.warn(
        'Got error while parsing 421 result. Dropping this snode from the swarm of this pubkey',
        e
      );
      // could not parse result. Consider that this snode as invalid
      await dropSnodeFromSwarmIfNeeded(associatedWith, snodeEd25519);
    }
  }
  await Onions.incrementBadSnodeCountOrDrop({ snodeEd25519, associatedWith });

  // this is important we throw so another retry is made and we exit the handling of that reponse
  throw new pRetry.AbortError(ERROR_421_HANDLED_RETRY_REQUEST);
}

/**
 * Handle a bad snode result.
 * The `snodeFailureCount` for that node is incremented. If it's more than `snodeFailureThreshold`,
 * we drop this node from the snode pool and from the associatedWith publicKey swarm if this is set.
 *
 * So after this call, if the snode keeps getting errors, we won't contact it again
 *
 * @param snodeEd25519 the snode ed25519 which cause issues (this might be a nodeNotFound)
 * @param guardNodeEd25519 the guard node ed25519 of the current path in use. a nodeNoteFound ed25519 is not part of any path, so we fallback to this one if we need to increment the bad path count of the current path in use
 * @param associatedWith if set, we will drop this snode from the swarm of the pubkey too
 * @param isNodeNotFound if set, we will drop this snode right now as this is an invalid node for the network.
 */
export async function incrementBadSnodeCountOrDrop({
  snodeEd25519,
  associatedWith,
}: {
  snodeEd25519: string;
  associatedWith?: string;
}) {
  const oldFailureCount = snodeFailureCount[snodeEd25519] || 0;
  const newFailureCount = oldFailureCount + 1;
  snodeFailureCount[snodeEd25519] = newFailureCount;
  if (newFailureCount >= snodeFailureThreshold) {
    window?.log?.warn(
      `Failure threshold reached for snode: ${ed25519Str(snodeEd25519)}; dropping it.`
    );

    if (associatedWith) {
      await dropSnodeFromSwarmIfNeeded(associatedWith, snodeEd25519);
    }
    await dropSnodeFromSnodePool(snodeEd25519);
    snodeFailureCount[snodeEd25519] = 0;

    await OnionPaths.dropSnodeFromPath(snodeEd25519);
  } else {
    window?.log?.warn(
      `Couldn't reach snode at: ${ed25519Str(
        snodeEd25519
      )}; setting his failure count to ${newFailureCount}`
    );
  }
}

/**
 * This call tries to send the request via onion. If we get a bad path, it handles the snode removing of the swarm and snode pool.
 * But the caller needs to handle the retry (and rebuild the path on his side if needed)
 */
export const sendOnionRequestHandlingSnodeEject = async ({
  destX25519Any,
  finalDestOptions,
  nodePath,
  abortSignal,
  associatedWith,
  finalRelayOptions,
  useV4,
}: {
  nodePath: Array<Snode>;
  destX25519Any: string;
  finalDestOptions: FinalDestOptions;
  finalRelayOptions?: FinalRelayOptions;
  abortSignal?: AbortSignal;
  associatedWith?: string;
  useV4: boolean;
}): Promise<SnodeResponse | SnodeResponseV4 | undefined> => {
  // this sendOnionRequest() call has to be the only one like this.
  // If you need to call it, call it through sendOnionRequestHandlingSnodeEject because this is the one handling path rebuilding and known errors
  let response;
  let decodingSymmetricKey;
  try {
    // this might throw a timeout error
    const result = await sendOnionRequest({
      nodePath,
      destX25519Any,
      finalDestOptions,
      finalRelayOptions,
      abortSignal,
      useV4,
    });
    response = result.response;
    if (
      !_.isEmpty(finalRelayOptions) &&
      response.status === 502 &&
      response.statusText === 'Bad Gateway'
    ) {
      // it's an opengroup server and it is not responding. Consider this as a ENETUNREACH
      throw new pRetry.AbortError('ENETUNREACH');
    }
    decodingSymmetricKey = result.decodingSymmetricKey;
  } catch (e) {
    window?.log?.warn('sendOnionRequest error message: ', e.message);
    if (e.code === 'ENETUNREACH' || e.message === 'ENETUNREACH') {
      throw e;
    }
  }
  // this call will handle the common onion failure logic.
  // if an error is not retryable a AbortError is triggered, which is handled by pRetry and retries are stopped
  if (useV4) {
    return processOnionResponseV4({
      response,
      symmetricKey: decodingSymmetricKey,
      guardNode: nodePath[0],
      lsrpcEd25519Key: finalDestOptions?.destination_ed25519_hex,
      abortSignal,
      associatedWith,
    });
  }

  return processOnionResponse({
    response,
    symmetricKey: decodingSymmetricKey,
    guardNode: nodePath[0],
    lsrpcEd25519Key: finalDestOptions?.destination_ed25519_hex,
    abortSignal,
    associatedWith,
  });
};

function throwIfInvalidV4RequestInfos(request: FinalDestOptions): EncodeV4OnionRequestInfos {
  const { body, endpoint, headers, method } = request;
  if (!endpoint || !method) {
    throw new Error('v4onion request needs endpoijt pubkey and method at least');
  }

  const requestInfos: EncodeV4OnionRequestInfos = {
    endpoint,
    headers,
    method,
    body,
  };

  return requestInfos;
}

export type FinalDestOptions = {
  destination_ed25519_hex?: string;
  headers?: Record<string, string>;
  body?: string | null | Uint8Array;
  method?: string | null;
  endpoint?: string | null;
};

/**
 *
 * Onion requests looks like this
 * Sender -> 1 -> 2 -> 3 -> Receiver
 * 1, 2, 3 = onion Snodes
 *
 *
 * @param nodePath the onion path to use to send the request
 * @param finalDestOptions those are the options for the request from 3 to Receiver. It contains for instance the payload and headers.
 * @param finalRelayOptions  those are the options 3 will use to make a request to R. It contains the host and port to make the request to, if the target is not a snode
 */
const sendOnionRequest = async ({
  nodePath,
  destX25519Any: destX25519hex,
  finalDestOptions: finalDestOptionsOri,
  finalRelayOptions,
  abortSignal,
  useV4,
}: {
  nodePath: Array<Snode>;
  destX25519Any: string;
  finalDestOptions: FinalDestOptions;
  finalRelayOptions?: FinalRelayOptions; // use only when the target is not a snode
  abortSignal?: AbortSignal;
  useV4: boolean;
}) => {
  // Warning: be sure to do a copy otherwise the delete below creates issue with retries
  // we want to forward the destination_ed25519_hex explicitely so remove it from the copy directly
  const finalDestOptions = cloneDeep(omit(finalDestOptionsOri, ['destination_ed25519_hex']));
  if (typeof destX25519hex !== 'string') {
    window?.log?.warn('destX25519hex was not a string');
    throw new Error('sendOnionRequest: destX25519hex was not a string');
  }

  // if a snode destination is set, use it
  const targetEd25519hex = finalDestOptionsOri.destination_ed25519_hex || undefined;

  finalDestOptions.headers = finalDestOptions.headers || {};

  // finalRelayOptions is set only if we try to communicate with something else than a service node as end target of the request.
  // so if that field is set, we are trying to communicate with a file server or an opengroup or whatever,
  // and if that field is not set, we are trying to communicate with a service node (for a retrieve/send/whatever request)
  const isRequestToSnode = !finalRelayOptions;

  let destCtx: DestinationContext;
  try {
    const bodyString = isString(finalDestOptions.body) ? finalDestOptions.body : null;
    const bodyBinary =
      !isString(finalDestOptions.body) && finalDestOptions.body ? finalDestOptions.body : null;
    if (isRequestToSnode) {
      delete finalDestOptions.body;

      const textEncoder = new TextEncoder();
      const bodyEncoded = bodyString ? textEncoder.encode(bodyString) : bodyBinary;
      if (!bodyEncoded) {
        throw new Error('bodyEncoded is empty after encoding');
      }
      if (useV4) {
        destCtx = await encryptOnionV4RequestForPubkey(
          destX25519hex,
          throwIfInvalidV4RequestInfos(finalDestOptions)
        );
      } else {
        // we shouldn't do any non v4 request to snode very soon
        destCtx = (await callUtilsWorker(
          'encryptForPubkey',
          destX25519hex,
          encodeCiphertextPlusJson(bodyEncoded, finalDestOptions)
        )) as DestinationContext;
      }
    } else {
      destCtx = useV4
        ? await encryptOnionV4RequestForPubkey(
            destX25519hex,
            throwIfInvalidV4RequestInfos(finalDestOptions)
          )
        : await encryptForPubKey(destX25519hex, finalDestOptions);
    }
  } catch (e) {
    window?.log?.error(
      'loki_rpc::sendOnionRequest - encryptForPubKey failure [',
      e.code,
      e.message,
      '] destination X25519',
      destX25519hex.substr(0, 32),
      '...',
      destX25519hex.substr(32)
    );
    throw e;
  }

  const payload = await buildOnionGuardNodePayload(
    nodePath,
    destCtx,
    useV4,
    targetEd25519hex,
    finalRelayOptions
  );

  const guardNode = nodePath[0];

  const guardFetchOptions: RequestInit = {
    method: 'POST',
    body: payload,
    // we are talking to a snode...
    agent: snodeHttpsAgent,
    headers: {
      'User-Agent': 'WhatsApp',
      'Accept-Language': 'en-us',
    },
    timeout: 25000,
  };

  if (abortSignal) {
    guardFetchOptions.signal = abortSignal as any;
  }

  const guardUrl = `https://${guardNode.ip}:${guardNode.port}/onion_req/v2`;
  // no logs for that one insecureNodeFetch as we do need to call insecureNodeFetch to our guardNodes
  // window?.log?.info('insecureNodeFetch => plaintext for sendOnionRequest');

  const response = await insecureNodeFetch(guardUrl, guardFetchOptions);
  return { response, decodingSymmetricKey: destCtx.symmetricKey };
};

async function sendOnionRequestSnodeDest(
  onionPath: Array<Snode>,
  targetNode: Snode,
  headers: Record<string, any>,

  plaintext?: string,
  associatedWith?: string
) {
  return sendOnionRequestHandlingSnodeEject({
    nodePath: onionPath,
    destX25519Any: targetNode.pubkey_x25519,
    finalDestOptions: {
      destination_ed25519_hex: targetNode.pubkey_ed25519,
      body: plaintext,
      headers,
    },
    associatedWith,
    useV4: false,
  });
}

export function getPathString(pathObjArr: Array<{ ip: string; port: number }>): string {
  return pathObjArr.map(node => `${node.ip}:${node.port}`).join(', ');
}

/**
 * If the fetch throws a retryable error we retry this call with a new path at most 3 times. If another error happens, we return it. If we have a result we just return it.
 */
export async function lokiOnionFetch({
  targetNode,
  associatedWith,
  body,
  headers,
}: {
  targetNode: Snode;
  headers: Record<string, any>;
  body?: string;
  associatedWith?: string;
}): Promise<SnodeResponse | undefined> {
  try {
    const retriedResult = await pRetry(
      async () => {
        // Get a path excluding `targetNode`:
        const path = await OnionPaths.getOnionPath({ toExclude: targetNode });
        const result = await sendOnionRequestSnodeDest(
          path,
          targetNode,
          headers,
          body,
          associatedWith
        );
        return result;
      },
      {
        retries: 3,
        factor: 1,
        minTimeout: 100,
        onFailedAttempt: e => {
          window?.log?.warn(
            `onionFetchRetryable attempt #${e.attemptNumber} failed. ${e.retriesLeft} retries left...`
          );
        },
      }
    );

    return retriedResult as SnodeResponse | undefined;
  } catch (e) {
    window?.log?.warn('onionFetchRetryable failed ', e.message);
    if (e?.errno === 'ENETUNREACH') {
      // better handle the no connection state
      throw new Error(ERROR_CODE_NO_CONNECT);
    }
    if (e?.message === CLOCK_OUT_OF_SYNC_MESSAGE_ERROR) {
      window?.log?.warn('Its a clock out of sync error ');
      throw new pRetry.AbortError(CLOCK_OUT_OF_SYNC_MESSAGE_ERROR);
    }
    throw e;
  }
}
