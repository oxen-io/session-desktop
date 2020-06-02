import { expect } from 'chai';
import sinon from 'sinon';
import { ImportMock } from 'ts-mock-imports';

import * as Data from '../../../../js/modules/data';

import { ChatMessage } from '../../../session/messages/outgoing';
import { MessageUtils } from '../../../session/utils';
import { PendingMessageCache } from '../../../session/sending/PendingMessageCache';

describe('PendingMessageCache', () => {
  const sandbox = sinon.createSandbox();

  let pendingMessageCache: PendingMessageCache;
  // TODO: Tighten up this type
  let pendingMessageCacheStub: any;

  beforeEach(() => {
    ImportMock.mockFunction(Data, 'getItemById').withArgs('id').returns('');
    ImportMock.mockFunction(Data, 'createOrUpdateItem').withArgs().returns(undefined);

    ImportMock.mockFunction(Data, 'getItemById', undefined).withArgs('number_id').resolves({
      id: 'number_id',
      value: 'abc.1',
    });

    // pendingMessageCacheStub = new PendingMessageCache();
    // ^ causes error; channels.getItemById not valid

    pendingMessageCacheStub = sandbox.createStubInstance(
      pendingMessageCache
    );
    // ^ the way to do it?
  });

  afterEach(() => {
    sandbox.restore();
    ImportMock.restore();
  });

  // Add to cache
  it('can add to cache', async () => {
    pendingMessageCache = new PendingMessageCache();

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

    const initialCache = pendingMessageCache.get();
    expect(initialCache).to.be.equal([]);

    await pendingMessageCache.add(device, message);
    const cache = pendingMessageCache.get();
    expect(cache).to.be.equal([rawMessage]);



    console.log('[vince] initialCache:', initialCache);
    console.log('[vince] cache:', cache);

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

