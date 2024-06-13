import { expect } from 'chai';
// eslint-disable-next-line import/order
import * as crypto from 'crypto';
import _ from 'lodash';
import Sinon, * as sinon from 'sinon';
import { SignalService } from '../../../../protobuf';
import { OpenGroupMessageV2 } from '../../../../session/apis/open_group_api/opengroupV2/OpenGroupMessageV2';
import { OpenGroupPollingUtils } from '../../../../session/apis/open_group_api/opengroupV2/OpenGroupPollingUtils';
import { SogsBlinding } from '../../../../session/apis/open_group_api/sogsv3/sogsBlinding';
import { BatchRequests } from '../../../../session/apis/snode_api/batchRequest';
import { GetNetworkTime } from '../../../../session/apis/snode_api/getNetworkTime';
import { SnodeNamespaces } from '../../../../session/apis/snode_api/namespaces';
import { Onions } from '../../../../session/apis/snode_api/onions';
import { ConvoHub } from '../../../../session/conversations/ConversationController';
import { OnionSending } from '../../../../session/onions/onionSend';
import { OnionV4 } from '../../../../session/onions/onionv4';
import { MessageSender } from '../../../../session/sending';
import { OutgoingRawMessage, PubKey } from '../../../../session/types';
import { MessageUtils, UserUtils } from '../../../../session/utils';
import { fromBase64ToArrayBuffer } from '../../../../session/utils/String';
import { TestUtils } from '../../../test-utils';
import {
  TypedStub,
  expectAsyncToThrow,
  stubCreateObjectUrl,
  stubData,
  stubUtilWorker,
  stubValidSnodeSwarm,
} from '../../../test-utils/utils';
import { TEST_identityKeyPair } from '../crypto/MessageEncrypter_test';
import { MessageEncrypter } from '../../../../session/crypto/MessageEncrypter';

describe('MessageSender', () => {
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(async () => {
    TestUtils.stubWindowLog();
    TestUtils.stubWindowFeatureFlags();
    ConvoHub.use().reset();
    TestUtils.stubData('getItemById').resolves();

    stubData('getAllConversations').resolves([]);
    stubData('saveConversation').resolves();
    await ConvoHub.use().load();
  });

  describe('send', () => {
    const ourNumber = TestUtils.generateFakePubKeyStr();
    let sessionMessageAPISendStub: TypedStub<typeof MessageSender, 'sendMessagesDataToSnode'>;
    let doSnodeBatchRequestStub: TypedStub<typeof BatchRequests, 'doSnodeBatchRequestNoRetries'>;
    let encryptStub: sinon.SinonStub<[PubKey, Uint8Array, SignalService.Envelope.Type]>;

    beforeEach(() => {
      sessionMessageAPISendStub = Sinon.stub(MessageSender, 'sendMessagesDataToSnode').resolves();
      doSnodeBatchRequestStub = Sinon.stub(
        BatchRequests,
        'doSnodeBatchRequestNoRetries'
      ).resolves();
      stubData('getMessageById').resolves();

      encryptStub = Sinon.stub(MessageEncrypter, 'encrypt').resolves({
        envelopeType: SignalService.Envelope.Type.SESSION_MESSAGE,
        cipherText: crypto.randomBytes(10),
      });

      Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns(ourNumber);
    });

    describe('retry', () => {
      let rawMessage: OutgoingRawMessage;

      beforeEach(async () => {
        rawMessage = await MessageUtils.toRawMessage(
          TestUtils.generateFakePubKey(),
          TestUtils.generateVisibleMessage(),
          SnodeNamespaces.Default
        );
      });

      it('should not retry if an error occurred during encryption', async () => {
        encryptStub.throws(new Error('Failed to encrypt'));

        const promise = () =>
          MessageSender.sendSingleMessage({
            message: rawMessage,
            attempts: 3,
            retryMinTimeout: 10,
            isSyncMessage: false,
          });
        await expectAsyncToThrow(promise, 'Failed to encrypt');
        expect(sessionMessageAPISendStub.callCount).to.equal(0);
      });

      it('should only call lokiMessageAPI once if no errors occured', async () => {
        stubValidSnodeSwarm();
        await MessageSender.sendSingleMessage({
          message: rawMessage,
          attempts: 3,
          retryMinTimeout: 10,
          isSyncMessage: false,
        });
        expect(doSnodeBatchRequestStub.callCount).to.equal(1);
      });

      it('should only retry the specified amount of times before throwing', async () => {
        stubValidSnodeSwarm();

        doSnodeBatchRequestStub.throws(new Error('API error'));
        const attempts = 2;
        const promise = MessageSender.sendSingleMessage({
          message: rawMessage,
          attempts,
          retryMinTimeout: 10,
          isSyncMessage: false,
        });
        await expect(promise).is.rejectedWith('API error');
        expect(doSnodeBatchRequestStub.callCount).to.equal(attempts);
      });

      it('should not throw error if successful send occurs within the retry limit', async () => {
        stubValidSnodeSwarm();
        doSnodeBatchRequestStub.onFirstCall().throws(new Error('API error'));
        await MessageSender.sendSingleMessage({
          message: rawMessage,
          attempts: 3,
          retryMinTimeout: 10,
          isSyncMessage: false,
        });
        expect(doSnodeBatchRequestStub.callCount).to.equal(2);
      });
    });

    describe('logic', () => {
      let messageEncyrptReturnEnvelopeType = SignalService.Envelope.Type.SESSION_MESSAGE;

      beforeEach(() => {
        encryptStub.callsFake(async (_device, plainTextBuffer, _type) => ({
          envelopeType: messageEncyrptReturnEnvelopeType,
          cipherText: plainTextBuffer,
        }));
      });

      it('should pass the correct values to lokiMessageAPI', async () => {
        TestUtils.setupTestWithSending();

        const device = TestUtils.generateFakePubKey();
        const visibleMessage = TestUtils.generateVisibleMessage();
        Sinon.stub(ConvoHub.use(), 'get').returns(undefined as any);

        const rawMessage = await MessageUtils.toRawMessage(
          device,
          visibleMessage,
          SnodeNamespaces.Default
        );

        await MessageSender.sendSingleMessage({
          message: rawMessage,
          attempts: 3,
          retryMinTimeout: 10,
          isSyncMessage: false,
        });

        const args = doSnodeBatchRequestStub.getCall(0).args;

        expect(args[3]).to.equal(device.key);
        const firstArg = args[0];
        expect(firstArg.length).to.equal(1);

        if (firstArg[0].method !== 'store') {
          throw new Error('expected a store request with data');
        }

        // expect(args[3]).to.equal(visibleMessage.timestamp); the timestamp is overwritten on sending by the network clock offset
        expect(firstArg[0].params.ttl).to.equal(visibleMessage.ttl());
        expect(firstArg[0].params.pubkey).to.equal(device.key);
        expect(firstArg[0].params.namespace).to.equal(SnodeNamespaces.Default);
        // the request timestamp is always used fresh with the offset as the request will be denied with a 406 otherwise (clock out of sync)
        expect(firstArg[0].params.timestamp).to.be.above(Date.now() - 10);
        expect(firstArg[0].params.timestamp).to.be.below(Date.now() + 10);
      });

      it('should correctly build the envelope and override the request timestamp but not the msg one', async () => {
        TestUtils.setupTestWithSending();
        messageEncyrptReturnEnvelopeType = SignalService.Envelope.Type.SESSION_MESSAGE;

        // This test assumes the encryption stub returns the plainText passed into it.
        const device = TestUtils.generateFakePubKey();
        Sinon.stub(ConvoHub.use(), 'get').returns(undefined as any);
        const visibleMessage = TestUtils.generateVisibleMessage();
        const rawMessage = await MessageUtils.toRawMessage(
          device,
          visibleMessage,
          SnodeNamespaces.Default
        );
        const offset = 200000;
        Sinon.stub(GetNetworkTime, 'getLatestTimestampOffset').returns(offset);
        await MessageSender.sendSingleMessage({
          message: rawMessage,
          attempts: 3,
          retryMinTimeout: 10,
          isSyncMessage: false,
        });

        const firstArg = doSnodeBatchRequestStub.getCall(0).args[0];

        if (firstArg[0].method !== 'store') {
          throw new Error('expected a store request with data');
        }
        const data = fromBase64ToArrayBuffer(firstArg[0].params.data);
        const webSocketMessage = SignalService.WebSocketMessage.decode(new Uint8Array(data));
        expect(webSocketMessage.request?.body).to.not.equal(
          undefined,
          'Request body should not be undefined'
        );
        expect(webSocketMessage.request?.body).to.not.equal(
          null,
          'Request body should not be null'
        );

        const envelope = SignalService.Envelope.decode(
          webSocketMessage.request?.body as Uint8Array
        );
        expect(envelope.type).to.equal(SignalService.Envelope.Type.SESSION_MESSAGE);
        expect(envelope.source).to.equal('');

        // the timestamp in the message is not overridden on sending as it should be set with the network offset when created.
        // we need that timestamp to not be overriden as the signature of the message depends on it.
        const decodedTimestampFromSending = _.toNumber(envelope.timestamp);
        expect(decodedTimestampFromSending).to.be.eq(visibleMessage.createAtNetworkTimestamp);

        // then, make sure that
      });

      describe('SESSION_MESSAGE', () => {
        it('should set the envelope source to be empty', async () => {
          TestUtils.setupTestWithSending();
          messageEncyrptReturnEnvelopeType = SignalService.Envelope.Type.SESSION_MESSAGE;
          Sinon.stub(ConvoHub.use(), 'get').returns(undefined as any);

          // This test assumes the encryption stub returns the plainText passed into it.
          const device = TestUtils.generateFakePubKey();
          const visibleMessage = TestUtils.generateVisibleMessage();
          const rawMessage = await MessageUtils.toRawMessage(
            device,
            visibleMessage,
            SnodeNamespaces.Default
          );
          await MessageSender.sendSingleMessage({
            message: rawMessage,
            attempts: 3,
            retryMinTimeout: 10,
            isSyncMessage: false,
          });

          const firstArg = doSnodeBatchRequestStub.getCall(0).args[0];

          if (firstArg[0].method !== 'store') {
            throw new Error('expected a store request with data');
          }
          const data = fromBase64ToArrayBuffer(firstArg[0].params.data);
          const webSocketMessage = SignalService.WebSocketMessage.decode(new Uint8Array(data));
          expect(webSocketMessage.request?.body).to.not.equal(
            undefined,
            'Request body should not be undefined'
          );
          expect(webSocketMessage.request?.body).to.not.equal(
            null,
            'Request body should not be null'
          );

          const envelope = SignalService.Envelope.decode(
            webSocketMessage.request?.body as Uint8Array
          );
          expect(envelope.type).to.equal(SignalService.Envelope.Type.SESSION_MESSAGE);
          expect(envelope.source).to.equal(
            '',
            'envelope source should be empty in SESSION_MESSAGE'
          );
        });
      });
    });
  });

  describe('sendToOpenGroupV2', () => {
    beforeEach(() => {
      Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').resolves(
        TestUtils.generateFakePubKey().key
      );
      Sinon.stub(UserUtils, 'getIdentityKeyPair').resolves(TEST_identityKeyPair);

      Sinon.stub(SogsBlinding, 'getSogsSignature').resolves(new Uint8Array());

      stubUtilWorker('arrayBufferToStringBase64', 'ba64');
      Sinon.stub(OnionSending, 'getOnionPathForSending').resolves([{}] as any);
      Sinon.stub(OnionSending, 'endpointRequiresDecoding').returnsArg(0);

      stubData('getGuardNodes').resolves([]);

      Sinon.stub(OpenGroupPollingUtils, 'getAllValidRoomInfos').returns([
        { roomId: 'room', serverPublicKey: 'whatever', serverUrl: 'serverUrl' },
      ]);
      Sinon.stub(OpenGroupPollingUtils, 'getOurOpenGroupHeaders').resolves({
        'X-SOGS-Pubkey': '00bac6e71efd7dfa4a83c98ed24f254ab2c267f9ccdb172a5280a0444ad24e89cc',
        'X-SOGS-Timestamp': '1642472103',
        'X-SOGS-Nonce': 'CdB5nyKVmQGCw6s0Bvv8Ww==',
        'X-SOGS-Signature':
          'gYqpWZX6fnF4Gb2xQM3xaXs0WIYEI49+B8q4mUUEg8Rw0ObaHUWfoWjMHMArAtP9QlORfiydsKWz1o6zdPVeCQ==',
      });
      stubCreateObjectUrl();

      Sinon.stub(OpenGroupMessageV2, 'fromJson').resolves();
    });

    afterEach(() => {
      Sinon.restore();
    });

    it('should call sendOnionRequestHandlingSnodeEjectStub', async () => {
      const sendOnionRequestHandlingSnodeEjectStub = Sinon.stub(
        Onions,
        'sendOnionRequestHandlingSnodeEjectNoRetries'
      ).resolves({} as any);
      Sinon.stub(OnionV4, 'decodeV4Response').returns({
        metadata: { code: 200 },
        body: {},
        bodyBinary: new Uint8Array(),
        bodyContentType: 'a',
      });
      Sinon.stub(OnionSending, 'getMinTimeoutForSogs').returns(5);
      const message = TestUtils.generateOpenGroupVisibleMessage();
      const roomInfos = TestUtils.generateOpenGroupV2RoomInfos();

      await MessageSender.sendToOpenGroupV2(message, roomInfos, false, []);
      expect(sendOnionRequestHandlingSnodeEjectStub.callCount).to.eq(1);
    });

    it('should retry sendOnionRequestHandlingSnodeEjectStub ', async () => {
      const message = TestUtils.generateOpenGroupVisibleMessage();
      const roomInfos = TestUtils.generateOpenGroupV2RoomInfos();
      Sinon.stub(Onions, 'sendOnionRequestHandlingSnodeEjectNoRetries').resolves({} as any);

      Sinon.stub(OnionSending, 'getMinTimeoutForSogs').returns(5);

      const decodev4responseStub = Sinon.stub(OnionV4, 'decodeV4Response');
      decodev4responseStub.throws('whate');

      decodev4responseStub.onThirdCall().returns({
        metadata: { code: 200 },
        body: {},
        bodyBinary: new Uint8Array(),
        bodyContentType: 'a',
      });
      await MessageSender.sendToOpenGroupV2(message, roomInfos, false, []);
      expect(decodev4responseStub.callCount).to.eq(3);
    });

    it('should not retry more than 3 sendOnionRequestHandlingSnodeEjectStub ', async () => {
      const message = TestUtils.generateOpenGroupVisibleMessage();
      const roomInfos = TestUtils.generateOpenGroupV2RoomInfos();
      Sinon.stub(Onions, 'sendOnionRequestHandlingSnodeEjectNoRetries').resolves({} as any);
      Sinon.stub(OnionSending, 'getMinTimeoutForSogs').returns(5);

      const decodev4responseStub = Sinon.stub(OnionV4, 'decodeV4Response');
      decodev4responseStub.throws('whate');

      decodev4responseStub.onCall(4).returns({
        metadata: { code: 200 },
        body: {},
        bodyBinary: new Uint8Array(),
        bodyContentType: 'a',
      });
      try {
        await MessageSender.sendToOpenGroupV2(message, roomInfos, false, []);
      } catch (e) {}
      // we made the fourth call success, but we should not get there. We should stop at 3 the retries (1+2)
      expect(decodev4responseStub.calledThrice);
    });
  });
});
