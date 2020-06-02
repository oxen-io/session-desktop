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
    expect(cache).to.have.length(0);
  });


  it('can add to cache', async () => {
    const device = '0582fe8822c684999663cc6636148328fbd47c0836814c118af4e326bb4f0e1000';
    const message = new ChatMessage({
      body: 'This is the message content',
      identifier: 'message_1',
      timestamp: Date.now(),
      attachments: undefined,
      quote: undefined,
      expireTimer: undefined,
      lokiProfile: undefined,
      preview: undefined,
    });

    const rawMessage = MessageUtils.toRawMessage(device, message);
    await pendingMessageCacheStub.add(device, message);

    // Verify that the message is in the cache
    const finalCache = pendingMessageCacheStub.cache;
    
    console.log('[vince] finalCache:', finalCache);

    // expect(finalCache).to.include.members([rawMessage]);
    // expect(finalCache).to.have.length(2);
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

