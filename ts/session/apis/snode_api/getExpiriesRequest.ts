/* eslint-disable no-restricted-syntax */
import { PubkeyType } from 'libsession_util_nodejs';
import { isFinite, isNil, isNumber } from 'lodash';
import pRetry from 'p-retry';
import { Snode } from '../../../data/data';
import { UserUtils } from '../../utils';
import { SeedNodeAPI } from '../seed_node_api';
import { GetExpiriesFromNodeSubRequest, fakeHash } from './SnodeRequestTypes';
import { BatchRequests } from './batchRequest';
import { SnodePool } from './snodePool';
import { GetExpiriesResultsContent, WithMessagesHashes } from './types';

export type GetExpiriesRequestResponseResults = Record<string, number>;

export async function processGetExpiriesRequestResponse(
  _targetNode: Snode,
  expiries: GetExpiriesResultsContent,
  messageHashes: Array<string>
): Promise<GetExpiriesRequestResponseResults> {
  if (isNil(expiries)) {
    throw Error(
      `[processGetExpiriesRequestResponse] Expiries are nul/undefined! ${JSON.stringify(
        messageHashes
      )}`
    );
  }

  const results: GetExpiriesRequestResponseResults = {};
  // Note: we iterate over the hash we've requested and not the one we received,
  // because a message which expired already is not in the result at all (and we need to force it to be expired)
  for (const messageHash of messageHashes) {
    const expiryMs = expiries[messageHash];

    if (expiries[messageHash] && isNumber(expiryMs) && isFinite(expiryMs)) {
      results[messageHash] = expiryMs;
    } // not adding the Date.now() fallback here as it is done in the caller of this function
  }

  return results;
}

async function getExpiriesFromNodesNoRetries(
  targetNode: Snode,
  messageHashes: Array<string>,
  associatedWith: PubkeyType
) {
  try {
    const expireRequest = new GetExpiriesFromNodeSubRequest({ messagesHashes: messageHashes });
    const result = await BatchRequests.doUnsignedSnodeBatchRequestNoRetries(
      [expireRequest],
      targetNode,
      10000,
      associatedWith,
      false,
      'batch'
    );

    if (!result || result.length !== 1) {
      throw Error(
        `There was an issue with the results. sessionRpc ${targetNode.ip}:${
          targetNode.port
        } expireRequest ${JSON.stringify(expireRequest)}`
      );
    }

    // TODOLATER make sure that this code still works once disappearing messages is merged
    // do a basic check to know if we have something kind of looking right (status 200 should always be there for a retrieve)
    const firstResult = result[0];

    if (firstResult.code !== 200) {
      throw Error(`getExpiriesFromNodesNoRetries result is not 200 but ${firstResult.code}`);
    }

    // expirationResults is a record of {messageHash: currentExpiry}
    const expirationResults = await processGetExpiriesRequestResponse(
      targetNode,
      firstResult.body.expiries as GetExpiriesResultsContent,
      expireRequest.messageHashes
    );

    // Note: even if expirationResults is empty we need to process the results.
    // The status code is 200, so if the results is empty, it means all those messages already expired.

    // Note: a hash which already expired on the server is not going to be returned. So we force it's fetchedExpiry to be now() to make it expire asap
    const expiriesWithForcedExpiried = expireRequest.messageHashes.map(messageHash => ({
      messageHash,
      fetchedExpiry: expirationResults?.[messageHash] || Date.now(),
    }));

    return expiriesWithForcedExpiried;
  } catch (err) {
    // NOTE batch requests have their own retry logic which includes abort errors that will break our retry logic so we need to catch them and throw regular errors
    if (err instanceof pRetry.AbortError) {
      throw Error(err.message);
    }

    throw err;
  }
}

/**
 * Sends an 'get_expiries' request which retrieves the current expiry timestamps of the given messages.
 *
 * The returned TTLs should be assigned to the given disappearing messages.
 * @param messageHashes the hashes of the messages we want the current expiries for
 * @param timestamp the time (ms) the request was initiated, must be within ±60s of the current time so using the server time is recommended.
 * @returns an arrray of the expiry timestamps (TTL) for the given messages
 */
export async function getExpiriesFromSnode({ messagesHashes }: WithMessagesHashes) {
  // FIXME There is a bug in the snode code that requires at least 2 messages to be requested. Will be fixed in next storage server release
  if (messagesHashes.length === 1) {
    messagesHashes.push(fakeHash);
  }

  const ourPubKey = UserUtils.getOurPubKeyStrFromCache();
  if (!ourPubKey) {
    window.log.error('[getExpiriesFromSnode] No pubkey found', messagesHashes);
    return [];
  }

  try {
    const fetchedExpiries = await pRetry(
      async () => {
        const targetNode = await SnodePool.getNodeFromSwarmOrThrow(ourPubKey);

        return getExpiriesFromNodesNoRetries(targetNode, messagesHashes, ourPubKey);
      },
      {
        retries: 3,
        factor: 2,
        minTimeout: SeedNodeAPI.getMinTimeout(),
        onFailedAttempt: e => {
          window?.log?.warn(
            `[getExpiriesFromSnode] get expiries from snode attempt #${e.attemptNumber} failed. ${e.retriesLeft} retries left... Error: ${e.message}`
          );
        },
      }
    );

    return fetchedExpiries;
  } catch (e) {
    window?.log?.warn(
      `[getExpiriesFromSnode] ${e.code ? `${e.code} ` : ''}${
        e.message || e
      } by ${ourPubKey} for ${messagesHashes}`
    );
    throw e;
  }
}
