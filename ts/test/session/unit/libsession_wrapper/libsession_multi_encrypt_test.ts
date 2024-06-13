import { expect } from 'chai';
import { MultiEncryptWrapperNode, UserGroupsWrapperNode } from 'libsession_util_nodejs';
import Sinon from 'sinon';
import { fromHexToArray } from '../../../../session/utils/String';
import { TestUtils } from '../../../test-utils';

describe('libsession_multi_encrypt', () => {
  // let us: TestUserKeyPairs;
  // let groupX25519SecretKey: Uint8Array;

  beforeEach(async () => {
    // us = await TestUtils.generateUserKeyPairs();
    // const group = await TestUtils.generateGroupV2(us.ed25519KeyPair.privKeyBytes);
    // if (!group.secretKey) {
    //   throw new Error('failed to create grou[p');
    // }
    // groupX25519SecretKey = group.secretKey;
  });
  afterEach(() => {
    Sinon.restore();
  });

  describe('encrypt/decrypt multi encrypt/decrypt  message', () => {
    it('can encrypt/decrypt message one message to one recipient', async () => {
      const toEncrypt = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const plaintext = new Uint8Array(toEncrypt);
      const domain = 'SessionGroupKickedMessage';

      const us = await TestUtils.generateUserKeyPairs();
      const userXPk = us.x25519KeyPair.pubKey.slice(1); // remove 05 prefix
      const userSk = us.ed25519KeyPair.privKeyBytes;

      const groupWrapper = new UserGroupsWrapperNode(us.ed25519KeyPair.privKeyBytes, null);
      const group = groupWrapper.createGroup();
      if (!group.secretKey) {
        throw new Error('failed to create group');
      }
      const groupEd25519SecretKey = group.secretKey;
      const groupEd25519Pubkey = fromHexToArray(group.pubkeyHex).slice(1); // remove 03 prefix

      const encrypted = MultiEncryptWrapperNode.multiEncrypt({
        messages: [plaintext],
        recipients: [userXPk],
        ed25519SecretKey: groupEd25519SecretKey,
        domain,
      });
      const decrypted = MultiEncryptWrapperNode.multiDecryptEd25519({
        domain,
        encoded: encrypted,
        userEd25519SecretKey: userSk,
        senderEd25519Pubkey: groupEd25519Pubkey,
      });
      expect(decrypted).to.be.deep.eq(Buffer.from(toEncrypt));
    });

    it('can encrypt/decrypt message multiple messages to multiple recipients', async () => {
      const toEncrypt1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const toEncrypt2 = [1, 2, 2, 3, 4, 5, 6, 7, 8, 9];
      const plaintext1 = new Uint8Array(toEncrypt1);
      const plaintext2 = new Uint8Array(toEncrypt2);
      const domain = 'SessionGroupKickedMessage';

      const user1 = await TestUtils.generateUserKeyPairs();
      const user1XPk = user1.x25519KeyPair.pubKey.slice(1); // remove 05 prefix
      const user1Sk = user1.ed25519KeyPair.privKeyBytes;
      const user2 = await TestUtils.generateUserKeyPairs();
      const user2XPk = user2.x25519KeyPair.pubKey.slice(1); // remove 05 prefix
      const user2Sk = user2.ed25519KeyPair.privKeyBytes;

      const groupWrapper = new UserGroupsWrapperNode(user1.ed25519KeyPair.privKeyBytes, null);
      const group = groupWrapper.createGroup();
      if (!group.secretKey) {
        throw new Error('failed to create group');
      }
      const groupEd25519SecretKey = group.secretKey;
      const groupEd25519Pubkey = fromHexToArray(group.pubkeyHex).slice(1); // remove 03 prefix

      const encrypted = MultiEncryptWrapperNode.multiEncrypt({
        messages: [plaintext1, plaintext2],
        recipients: [user1XPk, user2XPk],
        ed25519SecretKey: groupEd25519SecretKey,
        domain,
      });
      const decrypted1 = MultiEncryptWrapperNode.multiDecryptEd25519({
        domain,
        encoded: encrypted,
        userEd25519SecretKey: user1Sk,
        senderEd25519Pubkey: groupEd25519Pubkey,
      });

      const decrypted2 = MultiEncryptWrapperNode.multiDecryptEd25519({
        domain,
        encoded: encrypted,
        userEd25519SecretKey: user2Sk,
        senderEd25519Pubkey: groupEd25519Pubkey,
      });
      expect(decrypted1).to.be.deep.eq(Buffer.from(toEncrypt1));
      expect(decrypted2).to.be.deep.eq(Buffer.from(toEncrypt2));
    });

    it('can encrypt/decrypt one message to multiple recipients', async () => {
      const toEncrypt1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const plaintext1 = new Uint8Array(toEncrypt1);
      const domain = 'SessionGroupKickedMessage';

      const user1 = await TestUtils.generateUserKeyPairs();
      const user1XPk = user1.x25519KeyPair.pubKey.slice(1); // remove 05 prefix
      const user1Sk = user1.ed25519KeyPair.privKeyBytes;
      const user2 = await TestUtils.generateUserKeyPairs();
      const user2XPk = user2.x25519KeyPair.pubKey.slice(1); // remove 05 prefix
      const user2Sk = user2.ed25519KeyPair.privKeyBytes;

      const groupWrapper = new UserGroupsWrapperNode(user1.ed25519KeyPair.privKeyBytes, null);
      const group = groupWrapper.createGroup();
      if (!group.secretKey) {
        throw new Error('failed to create group');
      }
      const groupEd25519SecretKey = group.secretKey;
      const groupEd25519Pubkey = fromHexToArray(group.pubkeyHex).slice(1); // remove 03 prefix

      const encrypted = MultiEncryptWrapperNode.multiEncrypt({
        messages: [plaintext1],
        recipients: [user1XPk, user2XPk],
        ed25519SecretKey: groupEd25519SecretKey,
        domain,
      });
      const decrypted1 = MultiEncryptWrapperNode.multiDecryptEd25519({
        domain,
        encoded: encrypted,
        userEd25519SecretKey: user1Sk,
        senderEd25519Pubkey: groupEd25519Pubkey,
      });

      const decrypted2 = MultiEncryptWrapperNode.multiDecryptEd25519({
        domain,
        encoded: encrypted,
        userEd25519SecretKey: user2Sk,
        senderEd25519Pubkey: groupEd25519Pubkey,
      });
      expect(decrypted1).to.be.deep.eq(Buffer.from(toEncrypt1));
      expect(decrypted2).to.be.deep.eq(Buffer.from(toEncrypt1));
    });
  });
});
