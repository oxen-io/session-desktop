import { map, toNumber } from 'lodash';

import { Data } from '../data/data';
import { PubKey } from '../session/types';
import { StringUtils } from '../session/utils';
import { UnprocessedParameter } from '../types/sqlSharedTypes';
import { EnvelopePlus } from './types';

async function removeFromCache(envelope: Pick<EnvelopePlus, 'id'>) {
  return Data.removeUnprocessed(envelope.id);
}

function assertNon03Group(envelope: Pick<EnvelopePlus, 'source'>) {
  if (PubKey.is03Pubkey(envelope.source)) {
    window.log.warn('tried to addtocache message with source:', envelope.source);
    // 03 group message keys are handled first. We also block the polling until the current messages are processed (so not updating the corresponding last hash)
    // This means that we cannot miss a message from a 03 swarm, and if a message fails to be decrypted/handled, it will keep failing.
    // So, there is no need for cache at all for those messages, which is great news as we consider the caching to be legacy code, to be removed asap.
    throw new Error('addToCache we do not rely on the caching for 03 group messages');
  }
}

async function addToCache(envelope: EnvelopePlus, plaintext: ArrayBuffer, messageHash: string) {
  const { id } = envelope;
  assertNon03Group(envelope);

  const encodedEnvelope = StringUtils.decode(plaintext, 'base64');
  const data: UnprocessedParameter = {
    id,
    version: 2,
    envelope: encodedEnvelope,
    messageHash,
    timestamp: Date.now(),
    attempts: 1,
  };

  if (envelope.senderIdentity) {
    data.senderIdentity = envelope.senderIdentity;
  }
  await Data.saveUnprocessed(data);
}

async function fetchAllFromCache(): Promise<Array<UnprocessedParameter>> {
  const count = await Data.getUnprocessedCount();

  if (count > 1500) {
    await Data.removeAllUnprocessed();
    window?.log?.warn(`There were ${count} messages in cache. Deleted all instead of reprocessing`);
    return [];
  }

  return Data.getAllUnprocessed();
}

async function increaseAttemptsOrRemove(
  items: Array<UnprocessedParameter>
): Promise<Array<UnprocessedParameter>> {
  return Promise.all(
    map(items, async item => {
      const attempts = toNumber(item.attempts || 0) + 1;

      try {
        if (attempts >= 10) {
          window?.log?.warn('increaseAttemptsOrRemove final attempt for envelope', item.id);
          await Data.removeUnprocessed(item.id);
        } else {
          await Data.updateUnprocessedAttempts(item.id, attempts);
        }
      } catch (error) {
        window?.log?.error(
          'increaseAttemptsOrRemove error updating item after load:',
          error && error.stack ? error.stack : error
        );
      }

      return item;
    })
  );
}

async function getAllFromCache() {
  const items = await fetchAllFromCache();

  if (items.length) {
    window?.log?.info('getAllFromCache loaded', items.length, 'saved envelopes');
  }
  return increaseAttemptsOrRemove(items);
}

async function getAllFromCacheForSource(source: string) {
  const items = await fetchAllFromCache();

  // keep items without source too (for old message already added to the cache)
  const itemsFromSource = items.filter(
    item => !!item.senderIdentity || item.senderIdentity === source
  );

  window?.log?.info('getAllFromCacheForSource loaded', itemsFromSource.length, 'saved envelopes');

  return increaseAttemptsOrRemove(itemsFromSource);
}

async function updateCacheWithDecryptedContent({
  envelope,
  decryptedContent,
}: {
  envelope: Pick<EnvelopePlus, 'id' | 'senderIdentity' | 'source'>;
  decryptedContent: ArrayBuffer;
}): Promise<void> {
  assertNon03Group(envelope);

  const { id, senderIdentity, source } = envelope;
  const item = await Data.getUnprocessedById(id);
  if (!item) {
    window?.log?.error(
      `updateCacheWithDecryptedContent: Didn't find item ${id} in cache to update`
    );
    return;
  }

  item.source = source;

  // For medium-size closed groups
  if (envelope.senderIdentity) {
    item.senderIdentity = senderIdentity;
  }

  item.decrypted = StringUtils.decode(decryptedContent, 'base64');

  await Data.updateUnprocessedWithData(item.id, item);
}

async function forceEmptyCache() {
  await Data.removeAllUnprocessed();
}

export const IncomingMessageCache = {
  removeFromCache,
  addToCache,
  updateCacheWithDecryptedContent,
  getAllFromCacheForSource,
  getAllFromCache,
  forceEmptyCache,
};
