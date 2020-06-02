// tslint:disable-next-line: no-require-imports no-var-requires
const Data = require('../../../../js/modules/data');

import { expect } from 'chai';
import sinon from 'sinon';
import { ImportMock } from 'ts-mock-imports';


import { ChatMessage } from '../../../session/messages/outgoing';
import { MessageUtils } from '../../../session/utils';
import { PendingMessageCache } from '../../../session/sending/PendingMessageCache';
import { RawMessage } from '../../../session/types/RawMessage';

describe('PendingMessageCache', () => {
  const sandbox = sinon.createSandbox();
  let pendingMessageCacheStub: PendingMessageCache;

  beforeEach(() => {
    // tslint:disable-next-line: promise-function-async
    const wrapInPromise = (value: any) => new Promise(r => {
      r(value);
    });

    const mockStorageObject = wrapInPromise([] as Array<RawMessage>);
    const voidPromise = wrapInPromise(undefined);

    sandbox.stub(PendingMessageCache.prototype, 'getFromStorage').returns(mockStorageObject);
    sandbox.stub(PendingMessageCache.prototype, 'syncCacheWithDB').returns(voidPromise);

    pendingMessageCacheStub = new PendingMessageCache();
  });

  afterEach(() => {
    sandbox.restore();
  });

  // Add to cache
  it('can add to cache', async () => {
    const messages = pendingMessageCacheStub.get();
    console.log('[vince] messages:', messages);

    console.log('[vince] pendingMessageCacheStub:', pendingMessageCacheStub);

    const v1 = await pendingMessageCacheStub.syncCacheWithDB();
    const v2 = await pendingMessageCacheStub.getFromStorage();
    const v3 = pendingMessageCacheStub.sayHi();

    console.log('[vince] v1:', v1);
    console.log('[vince] v2:', v2);
    console.log('[vince] v3:', v3);

    const device = '0582fe8822c684999663cc6636148328fbd47c0836814c118af4e326bb4f0e1000';
    const message = new ChatMessage({
      body: 'This is the message content',
      identifier: '1234567890',
      timestamp: Date.now(),
      attachments: undefined,
      quote: undefined,
      expireTimer: undefined,
      lokiProfile: undefined,
      preview: undefined,
    });

    const rawMessage = MessageUtils.toRawMessage(device, message);

    const initialCache = pendingMessageCacheStub.get();
    console.log('[vince] initialCache:', initialCache);

    // expect(initialCache).to.be.equal([]);

    const addedMessage = await pendingMessageCacheStub.add(device, message);
    console.log('[vince] addedMessage:', addedMessage);

    const cache = pendingMessageCacheStub.get();
    console.log('[vince] cache:', cache);

    // expect(cache).to.be.equal([rawMessage]);
    

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

