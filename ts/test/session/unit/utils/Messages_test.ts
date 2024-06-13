/* eslint-disable no-unused-expressions */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Sinon from 'sinon';

import { ClosedGroupVisibleMessage } from '../../../../session/messages/outgoing/visibleMessage/ClosedGroupVisibleMessage';
import { PubKey } from '../../../../session/types';
import { MessageUtils } from '../../../../session/utils';
import { TestUtils } from '../../../test-utils';

import { SignalService } from '../../../../protobuf';
import { SnodeNamespaces } from '../../../../session/apis/snode_api/namespaces';
import { ClosedGroupAddedMembersMessage } from '../../../../session/messages/outgoing/controlMessage/group/ClosedGroupAddedMembersMessage';
import { ClosedGroupEncryptionPairMessage } from '../../../../session/messages/outgoing/controlMessage/group/ClosedGroupEncryptionPairMessage';
import { ClosedGroupEncryptionPairReplyMessage } from '../../../../session/messages/outgoing/controlMessage/group/ClosedGroupEncryptionPairReplyMessage';
import { ClosedGroupNameChangeMessage } from '../../../../session/messages/outgoing/controlMessage/group/ClosedGroupNameChangeMessage';
import { ClosedGroupNewMessage } from '../../../../session/messages/outgoing/controlMessage/group/ClosedGroupNewMessage';
import { ClosedGroupRemovedMembersMessage } from '../../../../session/messages/outgoing/controlMessage/group/ClosedGroupRemovedMembersMessage';

chai.use(chaiAsPromised as any);

const { expect } = chai;

const sharedNoExpire = {
  expireTimer: null,
  expirationType: null,
};

describe('Message Utils', () => {
  afterEach(() => {
    Sinon.restore();
  });

  describe('toRawMessage', () => {
    it('can convert to raw message', async () => {
      const device = TestUtils.generateFakePubKey();
      const message = TestUtils.generateVisibleMessage();

      const rawMessage = await MessageUtils.toRawMessage(
        device,
        message,
        SnodeNamespaces.UserContacts
      );

      expect(Object.keys(rawMessage)).to.have.length(7);

      expect(rawMessage.identifier).to.exist;
      expect(rawMessage.namespace).to.exist;
      expect(rawMessage.device).to.exist;
      expect(rawMessage.encryption).to.exist;
      expect(rawMessage.plainTextBuffer).to.exist;
      expect(rawMessage.ttl).to.exist;
      expect(rawMessage.networkTimestampCreated).to.exist;

      expect(rawMessage.identifier).to.equal(message.identifier);
      expect(rawMessage.device).to.equal(device.key);
      expect(rawMessage.plainTextBuffer).to.deep.equal(message.plainTextBuffer());
      expect(rawMessage.ttl).to.equal(message.ttl());
      expect(rawMessage.namespace).to.equal(3);
      expect(rawMessage.networkTimestampCreated).to.eq(message.createAtNetworkTimestamp);
    });

    it('should generate valid plainTextBuffer', async () => {
      const device = TestUtils.generateFakePubKey();
      const message = TestUtils.generateVisibleMessage();

      const rawMessage = await MessageUtils.toRawMessage(device, message, SnodeNamespaces.Default);

      const rawBuffer = rawMessage.plainTextBuffer;
      const rawBufferJSON = JSON.stringify(rawBuffer);
      const messageBufferJSON = JSON.stringify(message.plainTextBuffer());

      expect(rawBuffer instanceof Uint8Array).to.equal(
        true,
        'raw message did not contain a plainTextBuffer'
      );
      expect(rawBufferJSON).to.equal(
        messageBufferJSON,
        'plainTextBuffer was not converted correctly'
      );
    });

    it('should maintain pubkey', async () => {
      const device = TestUtils.generateFakePubKey();
      const message = TestUtils.generateVisibleMessage();

      const rawMessage = await MessageUtils.toRawMessage(device, message, SnodeNamespaces.Default);
      const derivedPubKey = PubKey.from(rawMessage.device);

      expect(derivedPubKey).to.not.be.eq(undefined, 'should maintain pubkey');
      expect(derivedPubKey?.isEqual(device)).to.equal(
        true,
        'pubkey of message was not converted correctly'
      );
    });

    it('should set encryption to ClosedGroup if a ClosedGroupVisibleMessage is passed in', async () => {
      const device = TestUtils.generateFakePubKey();
      const groupId = TestUtils.generateFakePubKeyStr();
      const chatMessage = TestUtils.generateVisibleMessage();
      const message = new ClosedGroupVisibleMessage({
        groupId,
        chatMessage,
        ...sharedNoExpire,
      });

      const rawMessage = await MessageUtils.toRawMessage(device, message, SnodeNamespaces.Default);
      expect(rawMessage.encryption).to.equal(SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE);
    });

    it('should set encryption to Fallback on other messages', async () => {
      const device = TestUtils.generateFakePubKey();
      const message = TestUtils.generateVisibleMessage();
      const rawMessage = await MessageUtils.toRawMessage(device, message, SnodeNamespaces.Default);

      expect(rawMessage.encryption).to.equal(SignalService.Envelope.Type.SESSION_MESSAGE);
    });

    it('passing ClosedGroupNewMessage returns Fallback', async () => {
      const device = TestUtils.generateFakePubKey();
      const member = TestUtils.generateFakePubKey().key;

      const msg = new ClosedGroupNewMessage({
        createAtNetworkTimestamp: Date.now(),
        name: 'df',
        members: [member],
        admins: [member],
        groupId: TestUtils.generateFakePubKey().key,
        keypair: TestUtils.generateFakeECKeyPair(),
        ...sharedNoExpire,
        expireTimer: 0,
      });
      const rawMessage = await MessageUtils.toRawMessage(device, msg, SnodeNamespaces.Default);
      expect(rawMessage.encryption).to.equal(SignalService.Envelope.Type.SESSION_MESSAGE);
    });

    it('passing ClosedGroupNameChangeMessage returns ClosedGroup', async () => {
      const device = TestUtils.generateFakePubKey();

      const msg = new ClosedGroupNameChangeMessage({
        createAtNetworkTimestamp: Date.now(),
        name: 'df',
        groupId: TestUtils.generateFakePubKey().key,
        ...sharedNoExpire,
      });
      const rawMessage = await MessageUtils.toRawMessage(device, msg, SnodeNamespaces.Default);
      expect(rawMessage.encryption).to.equal(SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE);
    });

    it('passing ClosedGroupAddedMembersMessage returns ClosedGroup', async () => {
      const device = TestUtils.generateFakePubKey();

      const msg = new ClosedGroupAddedMembersMessage({
        createAtNetworkTimestamp: Date.now(),
        addedMembers: [TestUtils.generateFakePubKey().key],
        groupId: TestUtils.generateFakePubKey().key,
        ...sharedNoExpire,
      });
      const rawMessage = await MessageUtils.toRawMessage(device, msg, SnodeNamespaces.Default);
      expect(rawMessage.encryption).to.equal(SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE);
    });

    it('passing ClosedGroupRemovedMembersMessage returns ClosedGroup', async () => {
      const device = TestUtils.generateFakePubKey();

      const msg = new ClosedGroupRemovedMembersMessage({
        createAtNetworkTimestamp: Date.now(),
        removedMembers: [TestUtils.generateFakePubKey().key],
        groupId: TestUtils.generateFakePubKey().key,
        ...sharedNoExpire,
      });
      const rawMessage = await MessageUtils.toRawMessage(device, msg, SnodeNamespaces.Default);
      expect(rawMessage.encryption).to.equal(SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE);
    });

    it('passing ClosedGroupEncryptionPairMessage returns ClosedGroup', async () => {
      const device = TestUtils.generateFakePubKey();

      const fakeWrappers =
        new Array<SignalService.DataMessage.ClosedGroupControlMessage.KeyPairWrapper>();
      fakeWrappers.push(
        new SignalService.DataMessage.ClosedGroupControlMessage.KeyPairWrapper({
          publicKey: new Uint8Array(8),
          encryptedKeyPair: new Uint8Array(8),
        })
      );
      const msg = new ClosedGroupEncryptionPairMessage({
        createAtNetworkTimestamp: Date.now(),
        groupId: TestUtils.generateFakePubKey().key,
        encryptedKeyPairs: fakeWrappers,
        ...sharedNoExpire,
      });
      const rawMessage = await MessageUtils.toRawMessage(device, msg, SnodeNamespaces.Default);
      expect(rawMessage.encryption).to.equal(SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE);
    });

    it('passing ClosedGroupEncryptionKeyPairReply returns Fallback', async () => {
      const device = TestUtils.generateFakePubKey();

      const fakeWrappers =
        new Array<SignalService.DataMessage.ClosedGroupControlMessage.KeyPairWrapper>();
      fakeWrappers.push(
        new SignalService.DataMessage.ClosedGroupControlMessage.KeyPairWrapper({
          publicKey: new Uint8Array(8),
          encryptedKeyPair: new Uint8Array(8),
        })
      );
      const msg = new ClosedGroupEncryptionPairReplyMessage({
        createAtNetworkTimestamp: Date.now(),
        groupId: TestUtils.generateFakePubKey().key,
        encryptedKeyPairs: fakeWrappers,
        ...sharedNoExpire,
      });
      const rawMessage = await MessageUtils.toRawMessage(device, msg, SnodeNamespaces.Default);
      expect(rawMessage.encryption).to.equal(SignalService.Envelope.Type.SESSION_MESSAGE);
    });
  });
});
