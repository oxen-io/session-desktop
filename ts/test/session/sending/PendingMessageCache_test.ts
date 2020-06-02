// tslint:disable-next-line: no-require-imports no-var-requires
const Data = require('../../../../js/modules/data');

import { expect } from 'chai';
import sinon from 'sinon';


import { ChatMessage } from '../../../session/messages/outgoing';
import { MessageUtils } from '../../../session/utils';
import { PendingMessageCache } from '../../../session/sending/PendingMessageCache';
import { RawMessage } from '../../../session/types/RawMessage';

describe('PendingMessageCache', () => {
  const sandbox = sinon.createSandbox();
  let pendingMessageCacheStub: PendingMessageCache;

  // tslint:disable-next-line: promise-function-async
  const wrapInPromise = (value: any) => new Promise(r => {
    r(value);
  });

  beforeEach(async () => {
    const mockStorageObject = wrapInPromise([] as Array<RawMessage>);
    const voidPromise = wrapInPromise(undefined);

    // Stub out methods which touch the database.
    sandbox.stub(PendingMessageCache.prototype, 'getFromStorage').returns(mockStorageObject);
    sandbox.stub(PendingMessageCache.prototype, 'syncCacheWithDB').returns(voidPromise);

    // Initialize new stubbed cache
    pendingMessageCacheStub = new PendingMessageCache();
    await pendingMessageCacheStub.init();
  });

  afterEach(() => {
    sandbox.restore();
  });


  it('can initialize cache', async () => {
    const { cache } = pendingMessageCacheStub;

    // We expect the cache to initialise as an empty array
    expect(cache).to.be.instanceOf(Array);
    expect(cache).to.have.length.below(1);
  });


  it('can add to cache', async () => {
    const initialCache = pendingMessageCacheStub.cache;
    console.log('[vince] initialCache:', initialCache);

    const fromStorage = pendingMessageCacheStub.getFromStorage();
    console.log('[vince] fromStorage:', fromStorage);
    // expect(fromStorage).should.eventually.equal(wrapInPromise([]));

    const device = '0582fe8822c684999663cc6636148328fbd47c0836814c118af4e326bb4f0e1000';

    const message_1 = new ChatMessage({
      body: 'This is the message content',
      identifier: '1234567890',
      timestamp: Date.now(),
      attachments: undefined,
      quote: undefined,
      expireTimer: undefined,
      lokiProfile: undefined,
      preview: undefined,
    });
    const message_2 = new ChatMessage({
      body: 'This is the message content',
      identifier: '0987654321',
      timestamp: Date.now(),
      attachments: undefined,
      quote: undefined,
      expireTimer: undefined,
      lokiProfile: undefined,
      preview: undefined,
    });

    const rawMessage_1 = MessageUtils.toRawMessage(device, message_1);
    const rawMessage_2 = MessageUtils.toRawMessage(device, message_2);

    await pendingMessageCacheStub.add(device, message_1);
    await pendingMessageCacheStub.add(device, message_2);

    // Verify that the message is in the cache
    const finalCache = pendingMessageCacheStub.cache;
    console.log('[vince] finalCache:', finalCache);
    // expect(finalCache).should.eventually.equal([rawMessage_1, rawMessage_2]);
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

