// tslint:disable-next-line: no-require-imports no-var-requires
const Data = require('../../../../js/modules/data');

import { expect } from 'chai';
import sinon from 'sinon';
import uuid from 'uuid';

import { ChatMessage } from '../../../session/messages/outgoing';
import { MessageUtils, PubKey } from '../../../session/utils';
import { PendingMessageCache } from '../../../session/sending/PendingMessageCache';
import { RawMessage } from '../../../session/types/RawMessage';
import { SignalService } from '../../../protobuf';

describe('PendingMessageCache', () => {
  const sandbox = sinon.createSandbox();
  let pendingMessageCacheStub: PendingMessageCache;

  // tslint:disable-next-line: promise-function-async
  const wrapInPromise = (value: any) => new Promise(r => {
    r(value);
  });

  const generateUniqueMessage = (): ChatMessage => {
    return new ChatMessage({
      body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
      identifier: uuid(),
      timestamp: Date.now(),
      attachments: undefined,
      quote: undefined,
      expireTimer: undefined,
      lokiProfile: undefined,
      preview: undefined,
    });
  };

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
    const device = PubKey.generate();
    const message = generateUniqueMessage();

    const rawMessage = MessageUtils.toRawMessage(device, message);
    await pendingMessageCacheStub.add(device, message);

    // Verify that the message is in the cache
    const finalCache = pendingMessageCacheStub.cache;

    expect(finalCache).to.have.length(1);

    const addedMessage = finalCache[0];
    expect(addedMessage.device).to.deep.equal(rawMessage.device);
    expect(addedMessage.timestamp).to.deep.equal(rawMessage.timestamp);
  });

  it('can remove from cache', async() => {
    //
  });

    // Get from storage working?

    // Get for device working?

    // Find in cache when something is there
    // Find in cache when there's nothing there

    
    // Clear cache working?

    // Get devices working? 
    // Get for device working?

    // Sync with DB working?




});

