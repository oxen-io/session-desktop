/* eslint-disable more/no-then */
import { isEmpty, last, toNumber } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import { EnvelopePlus } from './types';

import { IncomingMessageCache } from './cache';

// innerHandleSwarmContentMessage is only needed because of code duplication in handleDecryptedEnvelope...
import { handleSwarmContentMessage, innerHandleSwarmContentMessage } from './contentMessage';

import { Data } from '../data/data';
import { SignalService } from '../protobuf';
import { DURATION } from '../session/constants';
import { PubKey } from '../session/types';
import { StringUtils, UserUtils } from '../session/utils';
import { perfEnd, perfStart } from '../session/utils/Performance';
import { sleepFor } from '../session/utils/Promise';
import { createTaskWithTimeout } from '../session/utils/TaskWithTimeout';
import { UnprocessedParameter } from '../types/sqlSharedTypes';
import { getEnvelopeId } from './common';

export { downloadAttachment } from './attachments';

const incomingMessagePromises: Array<Promise<any>> = [];

export async function handleSwarmContentDecryptedWithTimeout({
  envelope,
  messageHash,
  sentAtTimestamp,
  contentDecrypted,
  messageExpirationFromRetrieve,
}: {
  envelope: EnvelopePlus;
  messageHash: string;
  sentAtTimestamp: number;
  contentDecrypted: ArrayBuffer;
  messageExpirationFromRetrieve: number | null;
}) {
  let taskDone = false;
  return Promise.race([
    (async () => {
      await sleepFor(1 * DURATION.MINUTES); // 1 minute expiry per message seems more than enough
      if (taskDone) {
        return;
      }
      window.log.error(
        'handleSwarmContentDecryptedWithTimeout timer expired for envelope ',
        envelope.id
      );
      await IncomingMessageCache.removeFromCache(envelope);
    })(),
    (async () => {
      try {
        await innerHandleSwarmContentMessage({
          envelope,
          messageHash,
          contentDecrypted,
          sentAtTimestamp,
          messageExpirationFromRetrieve,
        });
        await IncomingMessageCache.removeFromCache(envelope);
      } catch (e) {
        window.log.error(
          'handleSwarmContentDecryptedWithTimeout task failed with ',
          e.message,
          envelope.id
        );
      } finally {
        taskDone = true;
      }
    })(),
  ]);
}

async function handleSwarmEnvelope(
  envelope: EnvelopePlus,
  messageHash: string,
  messageExpiration: number | null
) {
  if (isEmpty(envelope.content)) {
    await IncomingMessageCache.removeFromCache(envelope);
    throw new Error('Received message with no content');
  }
  return handleSwarmContentMessage(envelope, messageHash, messageExpiration);
}

class EnvelopeQueue {
  // Last pending promise
  private pending: Promise<any> = Promise.resolve();

  public add(task: any): void {
    const promise = this.pending.then(task, task);
    this.pending = promise;

    this.pending.then(this.cleanup.bind(this, promise), this.cleanup.bind(this, promise));
  }

  private cleanup(promise: Promise<any>) {
    // We want to clear out the promise chain whenever possible because it could
    //   lead to large memory usage over time:
    //   https://github.com/nodejs/node/issues/6673#issuecomment-244331609
    if (this.pending === promise) {
      this.pending = Promise.resolve();
    }
  }
}

const envelopeQueue = new EnvelopeQueue();

function queueSwarmEnvelope(
  envelope: EnvelopePlus,
  messageHash: string,
  messageExpiration: number | null
) {
  const id = getEnvelopeId(envelope);
  const task = handleSwarmEnvelope.bind(null, envelope, messageHash, messageExpiration);
  const taskWithTimeout = createTaskWithTimeout(task, `queueSwarmEnvelope ${id}`);

  try {
    envelopeQueue.add(taskWithTimeout);
  } catch (error) {
    window?.log?.error(
      'queueSwarmEnvelope error handling envelope',
      id,
      ':',
      error && error.stack ? error.stack : error
    );
  }
}

function contentIsEnvelope(content: Uint8Array | EnvelopePlus): content is EnvelopePlus {
  return !isEmpty((content as EnvelopePlus).content);
}

async function handleRequestDetail(
  data: Uint8Array | EnvelopePlus,
  inConversation: string | null,
  lastPromise: Promise<any>,
  messageHash: string,
  messageExpiration: number
): Promise<void> {
  const envelope: any = contentIsEnvelope(data) ? data : SignalService.Envelope.decode(data);

  // The message is for a group
  if (inConversation) {
    const ourNumber = UserUtils.getOurPubKeyStrFromCache();
    const senderIdentity = envelope.source;

    if (senderIdentity === ourNumber) {
      return;
    }

    // Sender identity will be lost if we load from cache, because
    // plaintext (and protobuf.Envelope) does not have that field...
    envelope.source = inConversation;

    // eslint-disable-next-line no-param-reassign
    data = SignalService.Envelope.encode(envelope).finish();
    if (!PubKey.is03Pubkey(senderIdentity)) {
      envelope.senderIdentity = senderIdentity;
    }
  }

  envelope.id = uuidv4();
  envelope.serverTimestamp = envelope.serverTimestamp ? envelope.serverTimestamp.toNumber() : null;
  envelope.messageHash = messageHash;

  try {
    // NOTE: Annoyngly we add plaintext to the cache
    // after we've already processed some of it (thus the
    // need to handle senderIdentity separately)...
    perfStart(`addToCache-${envelope.id}`);

    await IncomingMessageCache.addToCache(
      envelope,
      contentIsEnvelope(data) ? data.content : data,
      messageHash
    );
    perfEnd(`addToCache-${envelope.id}`, 'addToCache');

    // To ensure that we queue in the same order we receive messages
    await lastPromise;

    queueSwarmEnvelope(envelope, messageHash, messageExpiration);
  } catch (error) {
    window?.log?.error(
      'handleRequest error trying to add message to cache:',
      error && error.stack ? error.stack : error
    );
  }
}

/**
 *
 * @param inConversation if the request is related to a group, this will be set to the group pubkey. Otherwise, it is set to null
 */
export function handleRequest(
  plaintext: EnvelopePlus | Uint8Array,
  inConversation: string | null,
  messageHash: string,
  messageExpiration: number
): void {
  const lastPromise = last(incomingMessagePromises) || Promise.resolve();

  const promise = handleRequestDetail(
    plaintext,
    inConversation,
    lastPromise,
    messageHash,
    messageExpiration
  ).catch(e => {
    window?.log?.error('Error handling incoming message:', e && e.stack ? e.stack : e);
  });

  incomingMessagePromises.push(promise);
}

/**
 * Used in main_renderer.js
 */
export async function queueAllCached() {
  const items = await IncomingMessageCache.getAllFromCache();

  await items.reduce(async (promise, item) => {
    await promise;
    await queueCached(item);
  }, Promise.resolve());
}

export async function queueAllCachedFromSource(source: string) {
  const items = await IncomingMessageCache.getAllFromCacheForSource(source);

  // queue all cached for this source, but keep the order
  await items.reduce(async (promise, item) => {
    await promise;
    await queueCached(item);
  }, Promise.resolve());
}

async function queueCached(item: UnprocessedParameter) {
  try {
    const envelopePlaintext = StringUtils.encode(item.envelope, 'base64');
    const envelopeArray = new Uint8Array(envelopePlaintext);

    const envelope: any = SignalService.Envelope.decode(envelopeArray);
    envelope.id = envelope.serverGuid || item.id;
    envelope.source = envelope.source || item.source;

    // Why do we need to do this???
    envelope.senderIdentity = envelope.senderIdentity || item.senderIdentity;

    // decrypted must be a decryptedContent here (SignalService.Content.parse will be called with it in the pipeline)
    const { decrypted: decryptedContentB64 } = item;

    if (decryptedContentB64) {
      const contentDecrypted = StringUtils.encode(decryptedContentB64, 'base64');
      // TODO we don't store the expiration in the cache, but we want to get rid of the cache at some point
      queueDecryptedEnvelope({
        envelope,
        contentDecrypted,
        messageHash: envelope.messageHash,
        messageExpirationFromRetrieve: null,
      });
    } else {
      queueSwarmEnvelope(envelope, envelope.messageHash, null);
    }
  } catch (error) {
    window?.log?.error(
      'queueCached error handling item',
      item.id,
      'removing it. Error:',
      error && error.stack ? error.stack : error
    );

    try {
      await Data.removeUnprocessed(item.id);
    } catch (deleteError) {
      window?.log?.error(
        'queueCached error deleting item',
        item.id,
        'Error:',
        deleteError && deleteError.stack ? deleteError.stack : deleteError
      );
    }
  }
}

function queueDecryptedEnvelope({
  contentDecrypted,
  envelope,
  messageHash,
  messageExpirationFromRetrieve,
}: {
  envelope: any;
  contentDecrypted: ArrayBuffer;
  messageHash: string;
  messageExpirationFromRetrieve: number | null;
}) {
  const id = getEnvelopeId(envelope);
  window?.log?.info('queueing decrypted envelope', id);

  const task = handleDecryptedEnvelope.bind(null, {
    envelope,
    contentDecrypted,
    messageHash,
    messageExpirationFromRetrieve,
  });

  const taskWithTimeout = createTaskWithTimeout(task, `queueEncryptedEnvelope ${id}`);
  try {
    envelopeQueue.add(taskWithTimeout);
  } catch (error) {
    window?.log?.error(
      `queueDecryptedEnvelope error handling envelope ${id}:`,
      error && error.stack ? error.stack : error
    );
  }
}

async function handleDecryptedEnvelope({
  envelope,
  messageHash,
  contentDecrypted,
  messageExpirationFromRetrieve,
}: {
  envelope: EnvelopePlus;
  contentDecrypted: ArrayBuffer;
  messageHash: string;
  messageExpirationFromRetrieve: number | null;
}) {
  if (!envelope.content) {
    await IncomingMessageCache.removeFromCache(envelope);
  }
  const sentAtTimestamp = toNumber(envelope.timestamp);

  await innerHandleSwarmContentMessage({
    envelope,
    sentAtTimestamp,
    contentDecrypted,
    messageHash,
    messageExpirationFromRetrieve,
  });
}
