import { expect } from 'chai';

import sinon from 'sinon';
import * as Data from '../../../../js/modules/data';

import { ChatMessage } from '../../../session/messages/outgoing';
import { MessageUtils } from '../../../session/utils';
import { PendingMessageCache } from '../../../session/sending/PendingMessageCache';

const sandbox = sinon.sandbox.create();

describe('PendingMessageCache', () => {
  let pendingMessageCache: PendingMessageCache;

  beforeEach(() => {
    sandbox.stub(Data, 'getItemById').returns('');
    sandbox.stub(Data, 'createOrUpdateItem');
    
    pendingMessageCache = new PendingMessageCache();
  });

  afterEach(() => {
    sandbox.restore();
  });

  // Add to cache
  it('can add to cache', async () => {
    const device = '0582fe8822c684999663cc6636148328fbd47c0836814c118af4e326bb4f0e1000';
    const message = new ChatMessage({
      body: "This is the message content",
      identifier: '1234567890',
      timestamp: Date.now(),
      attachments: undefined,
      quote: undefined,
      expireTimer: undefined,
      lokiProfile: undefined,
      preview: undefined,
    });

    const rawMessage = MessageUtils.toRawMessage(device, message);

    const initialCache = pendingMessageCache.get();
    expect(initialCache).to.be.equal([]);

    await pendingMessageCache.add(device, message);
    const cache = pendingMessageCache.get();
    expect(cache).to.be.equal([rawMessage]);

    console.log(initialCache);
    console.log(cache);
  });
    

    // Get from storage working?

    // Get for device working?

    // Find in cache when something is there
    // Find in cache when there's nothing there

    
    // Clear cache working?

    // Remove from cache

    // Get devices working? 
    // Get for device working?

    // Sync with DB working?




});
