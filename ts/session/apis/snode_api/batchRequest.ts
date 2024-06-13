import { isArray } from 'lodash';
import { Snode } from '../../../data/data';
import { MessageSender } from '../../sending';
import { processOnionRequestErrorAtDestination, SnodeResponse } from './onions';
import { SessionRpc } from './sessionRpc';
import {
  builtRequestToLoggingId,
  BuiltSnodeSubRequests,
  MAX_SUBREQUESTS_COUNT,
  MethodBatchType,
  NotEmptyArrayOfBatchResults,
  RawSnodeSubRequests,
} from './SnodeRequestTypes';

function logSubRequests(requests: Array<BuiltSnodeSubRequests>) {
  return `[${requests.map(builtRequestToLoggingId).join(', ')}]`;
}

/**
 * This is the equivalent to the batch send on sogs. The target node runs each sub request and returns a list of all the sub status and bodies.
 * If the global status code is not 200, an exception is thrown.
 * The body is already parsed from json and is enforced to be an Array of at least one element
 * Note: This function does not retry by itself.
 *
 * @param subRequests the list of requests to do
 * @param targetNode the node to do the request to, once all the onion routing is done
 * @param timeout the timeout at which we should cancel this request.
 * @param associatedWith used mostly for handling 421 errors, we need the pubkey the change is associated to
 * @param method can be either batch or sequence. A batch call will run all calls even if one of them fails. A sequence call will stop as soon as the first one fails
 */
async function doSnodeBatchRequestNoRetries(
  subRequests: Array<BuiltSnodeSubRequests>,
  targetNode: Snode,
  timeout: number,
  associatedWith: string | null,
  allow401s: boolean,
  method: MethodBatchType = 'batch'
): Promise<NotEmptyArrayOfBatchResults> {
  window.log.debug(
    `doSnodeBatchRequestNoRetries "${method}":`,
    JSON.stringify(logSubRequests(subRequests))
  );

  if (subRequests.length > MAX_SUBREQUESTS_COUNT) {
    window.log.error(
      `batch subRequests count cannot be more than ${MAX_SUBREQUESTS_COUNT}. Got ${subRequests.length}`
    );
    throw new Error(
      `batch subRequests count cannot be more than ${MAX_SUBREQUESTS_COUNT}. Got ${subRequests.length}`
    );
  }
  const result = await SessionRpc.snodeRpcNoRetries({
    method,
    params: { requests: subRequests },
    targetNode,
    associatedWith,
    allow401s,
    timeout,
  });

  if (!result) {
    window?.log?.warn(
      `doSnodeBatchRequestNoRetries - sessionRpc could not talk to ${targetNode.ip}:${targetNode.port}`
    );
    throw new Error(
      `doSnodeBatchRequestNoRetries - sessionRpc could not talk to ${targetNode.ip}:${targetNode.port}`
    );
  }
  const decoded = decodeBatchRequest(result);

  if (decoded?.length) {
    for (let index = 0; index < decoded.length; index++) {
      const resultRow = decoded[index];
      // eslint-disable-next-line no-await-in-loop
      await processOnionRequestErrorAtDestination({
        statusCode: resultRow.code,
        body: JSON.stringify(resultRow.body),
        associatedWith: associatedWith || undefined,
        destinationSnodeEd25519: targetNode.pubkey_ed25519,
        allow401s,
      });
    }
  }

  return decoded;
}

/**
 * This function can be called to make the sign the subrequests and then call doSnodeBatchRequestNoRetries with the signed requests.
 *
 * Note: this function does not retry.
 *
 * @param unsignedSubRequests the unsigned sub requests to make
 * @param targetNode the snode to make the request to
 * @param timeout the max timeout to wait for a reply
 * @param associatedWith the pubkey associated with this request (used to remove snode failing to reply from that users' swarm)
 * @param method the type of request to make batch or sequence
 * @returns
 */
async function doUnsignedSnodeBatchRequestNoRetries(
  unsignedSubRequests: Array<RawSnodeSubRequests>,
  targetNode: Snode,
  timeout: number,
  associatedWith: string | null,
  allow401s: boolean,
  method: MethodBatchType = 'batch'
): Promise<NotEmptyArrayOfBatchResults> {
  const signedSubRequests = await MessageSender.signSubRequests(unsignedSubRequests);
  return BatchRequests.doSnodeBatchRequestNoRetries(
    signedSubRequests,
    targetNode,
    timeout,
    associatedWith,
    allow401s,
    method
  );
}

/**
 * Make sure the global batch status code is 200, parse the content as json and return it
 */
function decodeBatchRequest(snodeResponse: SnodeResponse): NotEmptyArrayOfBatchResults {
  try {
    // console.error('decodeBatch: ', snodeResponse);
    if (snodeResponse.status !== 200) {
      throw new Error(`decodeBatchRequest invalid status code: ${snodeResponse.status}`);
    }
    const parsed = JSON.parse(snodeResponse.body);

    if (!isArray(parsed.results)) {
      throw new Error('decodeBatchRequest results is not an array');
    }

    if (!parsed.results.length) {
      throw new Error('decodeBatchRequest results an empty array');
    }

    return parsed.results;
  } catch (e) {
    window.log.error('decodeBatchRequest failed with ', e.message);
    throw e;
  }
  // "{"results":[{"body":"retrieve signature verification failed","code":401}]}"
}

export const BatchRequests = {
  doSnodeBatchRequestNoRetries,
  doUnsignedSnodeBatchRequestNoRetries,
};
