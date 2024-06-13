import { expect } from 'chai';
import {
  GroupMemberGet,
  MetaGroupWrapperNode,
  PubkeyType,
  UserGroupsWrapperNode,
} from 'libsession_util_nodejs';
import { range } from 'lodash';
import Sinon from 'sinon';
import { HexString } from '../../../../node/hexStrings';
import { toFixedUint8ArrayOfLength } from '../../../../types/sqlSharedTypes';
import { TestUtils } from '../../../test-utils';
import { TestUserKeyPairs } from '../../../test-utils/utils';

function profilePicture() {
  return { key: new Uint8Array(range(0, 32)), url: `${Math.random()}` };
}

function emptyMember(pubkeyHex: PubkeyType): GroupMemberGet {
  return {
    inviteFailed: false,
    invitePending: false,
    name: '',
    profilePicture: {
      key: null,
      url: null,
    },
    promoted: false,
    promotionFailed: false,
    promotionPending: false,
    admin: false,
    removedStatus: 0,
    pubkeyHex,
  };
}

describe('libsession_metagroup', () => {
  let us: TestUserKeyPairs;
  let groupCreated: ReturnType<UserGroupsWrapperNode['createGroup']>;
  let metaGroupWrapper: MetaGroupWrapperNode;
  let member: PubkeyType;
  let member2: PubkeyType;

  beforeEach(async () => {
    us = await TestUtils.generateUserKeyPairs();
    const groupWrapper = new UserGroupsWrapperNode(us.ed25519KeyPair.privateKey, null);
    groupCreated = groupWrapper.createGroup();

    metaGroupWrapper = new MetaGroupWrapperNode({
      groupEd25519Pubkey: toFixedUint8ArrayOfLength(
        HexString.fromHexString(groupCreated.pubkeyHex.slice(2)),
        32
      ).buffer,
      groupEd25519Secretkey: groupCreated.secretKey,
      metaDumped: null,
      userEd25519Secretkey: toFixedUint8ArrayOfLength(us.ed25519KeyPair.privateKey, 64).buffer,
    });
    metaGroupWrapper.keyRekey();
    member = TestUtils.generateFakePubKeyStr();
    member2 = TestUtils.generateFakePubKeyStr();
  });
  afterEach(() => {
    Sinon.restore();
  });

  describe("encrypt/decrypt group's message", () => {
    it('can encrypt/decrypt message for group with us as author', async () => {
      const plaintext = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const toEncrypt = new Uint8Array(plaintext);
      const [encrypted] = metaGroupWrapper.encryptMessages([toEncrypt]);
      const decrypted = metaGroupWrapper.decryptMessage(encrypted);

      expect(decrypted.plaintext).to.be.deep.eq(toEncrypt);
      expect(decrypted.pubkeyHex).to.be.deep.eq(us.x25519KeyPair.pubkeyHex);
    });

    it('throws when encrypt/decrypt message when content is messed up', async () => {
      const plaintext = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const toEncrypt = new Uint8Array(plaintext);
      const [encrypted] = metaGroupWrapper.encryptMessages([toEncrypt]);

      encrypted[1] -= 1;
      const func = () => metaGroupWrapper.decryptMessage(encrypted);
      expect(func).to.throw('unable to decrypt ciphertext with any current group keys');
    });
  });

  describe('info', () => {
    it('all fields are accounted for', () => {
      const info = metaGroupWrapper.infoGet();
      expect(Object.keys(info).length).to.be.eq(
        7, // if you change this value, also make sure you add a test, testing that field, below
        'this test is designed to fail if you need to add tests to test a new field of libsession'
      );
    });

    it('can set and recover group name', () => {
      expect(metaGroupWrapper.infoGet().name).to.be.deep.eq(null);
      const info = metaGroupWrapper.infoGet();
      info.name = 'fake name';
      metaGroupWrapper.infoSet(info);
      expect(metaGroupWrapper.infoGet().name).to.be.deep.eq('fake name');
    });

    it('can set and recover group createdAt', () => {
      const expected = 1234;
      expect(metaGroupWrapper.infoGet().createdAtSeconds).to.be.deep.eq(null);
      const info = metaGroupWrapper.infoGet();
      info.createdAtSeconds = expected;
      metaGroupWrapper.infoSet(info);
      expect(metaGroupWrapper.infoGet().createdAtSeconds).to.be.deep.eq(expected);
    });

    it('can set and recover group deleteAttachBeforeSeconds', () => {
      const expected = 1234;
      expect(metaGroupWrapper.infoGet().deleteAttachBeforeSeconds).to.be.deep.eq(null);
      const info = metaGroupWrapper.infoGet();
      info.deleteAttachBeforeSeconds = expected;
      metaGroupWrapper.infoSet(info);
      expect(metaGroupWrapper.infoGet().deleteAttachBeforeSeconds).to.be.deep.eq(expected);
    });

    it('can set and recover group deleteBeforeSeconds', () => {
      const expected = 1234;
      expect(metaGroupWrapper.infoGet().deleteBeforeSeconds).to.be.deep.eq(null);
      const info = metaGroupWrapper.infoGet();
      info.deleteBeforeSeconds = expected;
      metaGroupWrapper.infoSet(info);
      expect(metaGroupWrapper.infoGet().deleteBeforeSeconds).to.be.deep.eq(expected);
    });

    it('can set and recover group expirySeconds', () => {
      const expected = 1234;
      expect(metaGroupWrapper.infoGet().expirySeconds).to.be.deep.eq(null);
      const info = metaGroupWrapper.infoGet();
      info.expirySeconds = expected;
      metaGroupWrapper.infoSet(info);
      expect(metaGroupWrapper.infoGet().expirySeconds).to.be.deep.eq(expected);
    });

    it('can set and recover group isDestroyed', () => {
      expect(metaGroupWrapper.infoGet().isDestroyed).to.be.deep.eq(false);
      metaGroupWrapper.infoDestroy();
      expect(metaGroupWrapper.infoGet().isDestroyed).to.be.deep.eq(true);
    });

    it('can set and recover group profilePicture', () => {
      const expected = { key: new Uint8Array(range(0, 32)), url: '1234' };
      expect(metaGroupWrapper.infoGet().profilePicture).to.be.deep.eq({ url: null, key: null });
      const info = metaGroupWrapper.infoGet();

      info.profilePicture = expected;
      metaGroupWrapper.infoSet(info);
      expect(metaGroupWrapper.infoGet().profilePicture).to.be.deep.eq(expected);
    });
  });

  describe('members', () => {
    it('all fields are accounted for', () => {
      const memberCreated = metaGroupWrapper.memberGetOrConstruct(member);
      console.info('Object.keys(memberCreated) ', JSON.stringify(Object.keys(memberCreated)));
      expect(Object.keys(memberCreated).length).to.be.eq(
        10, // if you change this value, also make sure you add a test, testing that new field, below
        'this test is designed to fail if you need to add tests to test a new field of libsession'
      );
    });

    it('can add member by setting its promoted state, both ok and nok', () => {
      metaGroupWrapper.memberSetPromoted(member, false);
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(1);
      expect(metaGroupWrapper.memberGetAll()[0]).to.be.deep.eq({
        ...emptyMember(member),
        promoted: true,
        promotionPending: true,
        promotionFailed: false,
        admin: false,
      });

      metaGroupWrapper.memberSetPromoted(member2, true);
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(2);
      // the list is sorted by member pk, which means that index based test do not work
      expect(metaGroupWrapper.memberGet(member2)).to.be.deep.eq({
        ...emptyMember(member2),
        promoted: true,
        promotionFailed: true,
        promotionPending: true,
        admin: false,
      });

      // we test the admin: true case below
    });

    it('can add member by setting its invited state, both ok and nok', () => {
      metaGroupWrapper.memberSetInvited(member, false); // with invite success
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(1);
      expect(metaGroupWrapper.memberGetAll()[0]).to.be.deep.eq({
        ...emptyMember(member),
        invitePending: true,
        inviteFailed: false,
      });

      metaGroupWrapper.memberSetInvited(member2, true); // with invite failed
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(2);
      expect(metaGroupWrapper.memberGet(member2)).to.be.deep.eq({
        ...emptyMember(member2),
        invitePending: true,
        inviteFailed: true,
      });
    });

    it('can add member by setting its accepted state', () => {
      metaGroupWrapper.memberSetAccepted(member);
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(1);
      expect(metaGroupWrapper.memberGetAll()[0]).to.be.deep.eq({
        ...emptyMember(member),
      });

      metaGroupWrapper.memberSetAccepted(member2);
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(2);
      expect(metaGroupWrapper.memberGet(member2)).to.be.deep.eq({
        ...emptyMember(member2),
      });
    });

    it('can erase member', () => {
      metaGroupWrapper.memberSetAccepted(member);
      metaGroupWrapper.memberSetPromoted(member2, false);
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(2);

      expect(metaGroupWrapper.memberGet(member)).to.be.deep.eq({
        ...emptyMember(member),
      });
      expect(metaGroupWrapper.memberGet(member2)).to.be.deep.eq({
        ...emptyMember(member2),
        promoted: true,
        promotionPending: true,
      });

      const rekeyed = metaGroupWrapper.memberEraseAndRekey([member2]);
      expect(rekeyed).to.be.eq(true);
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(1);
      expect(metaGroupWrapper.memberGetAll()[0]).to.be.deep.eq({
        ...emptyMember(member),
      });
    });

    it('can add via name set', () => {
      metaGroupWrapper.memberSetName(member, 'member name');
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(1);
      expect(metaGroupWrapper.memberGetAll()[0]).to.be.deep.eq({
        ...emptyMember(member),
        name: 'member name',
      });
    });

    it('can add via profile picture set', () => {
      const pic = profilePicture();
      metaGroupWrapper.memberSetProfilePicture(member, pic);
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(1);
      const expected = { ...emptyMember(member), profilePicture: pic };

      expect(metaGroupWrapper.memberGetAll()[0]).to.be.deep.eq(expected);
    });

    it('can add via admin set', () => {
      metaGroupWrapper.memberSetAdmin(member);
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(1);
      const expected: GroupMemberGet = {
        ...emptyMember(member),
        admin: true,
        promoted: true,
        promotionFailed: false,
        promotionPending: false,
      };

      expect(metaGroupWrapper.memberGetAll()[0]).to.be.deep.eq(expected);
    });

    it('can mark as removed with messages', () => {
      metaGroupWrapper.membersMarkPendingRemoval([member], true);
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(1);
      const expected: GroupMemberGet = {
        ...emptyMember(member),
        removedStatus: 2,
      };
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(1);
      expect(metaGroupWrapper.memberGetAll()[0]).to.be.deep.eq(expected);
    });

    it('can mark as removed without messages', () => {
      metaGroupWrapper.membersMarkPendingRemoval([member], false);
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(1);
      const expected: GroupMemberGet = {
        ...emptyMember(member),
        removedStatus: 1,
      };
      expect(metaGroupWrapper.memberGetAll().length).to.be.deep.eq(1);
      expect(metaGroupWrapper.memberGetAll()[0]).to.be.deep.eq(expected);
    });
  });

  describe('keys', () => {
    it('fresh group does not need rekey', () => {
      expect(metaGroupWrapper.keysNeedsRekey()).to.be.eq(
        false,
        'rekey should be false on fresh group'
      );
    });

    it.skip('merging a key conflict marks needsRekey to true', () => {
      const metaGroupWrapper2 = new MetaGroupWrapperNode({
        groupEd25519Pubkey: toFixedUint8ArrayOfLength(
          HexString.fromHexString(groupCreated.pubkeyHex.slice(2)),
          32
        ).buffer,
        groupEd25519Secretkey: groupCreated.secretKey,
        metaDumped: null,
        userEd25519Secretkey: toFixedUint8ArrayOfLength(us.ed25519KeyPair.privateKey, 64).buffer,
      });

      // mark current user as admin
      metaGroupWrapper.memberSetPromoted(us.x25519KeyPair.pubkeyHex, false);
      metaGroupWrapper2.memberSetPromoted(us.x25519KeyPair.pubkeyHex, false);

      // add 2 normal members to each of those wrappers
      const m1 = TestUtils.generateFakePubKeyStr();
      const m2 = TestUtils.generateFakePubKeyStr();
      metaGroupWrapper.memberSetAccepted(m1);
      metaGroupWrapper.memberSetAccepted(m2);
      metaGroupWrapper2.memberSetAccepted(m1);
      metaGroupWrapper2.memberSetAccepted(m2);

      expect(metaGroupWrapper.keysNeedsRekey()).to.be.eq(false);
      expect(metaGroupWrapper2.keysNeedsRekey()).to.be.eq(false);

      // remove m2 from wrapper2, and m1 from wrapper1
      const rekeyed1 = metaGroupWrapper2.memberEraseAndRekey([m2]);
      const rekeyed2 = metaGroupWrapper.memberEraseAndRekey([m1]);
      expect(rekeyed1).to.be.eq(true);
      expect(rekeyed2).to.be.eq(true);

      // const push1 = metaGroupWrapper.push();
      // metaGroupWrapper2.metaMerge([push1]);

      // const wrapper2Rekeyed = metaGroupWrapper2.keyRekey();
      // metaGroupWrapper.keyRekey();

      // const loadedKey = metaGroupWrapper.loadKeyMessage('fakehash1', wrapper2Rekeyed, Date.now());
      // expect(loadedKey).to.be.eq(true, 'key should have been loaded');
      expect(metaGroupWrapper.keysNeedsRekey()).to.be.eq(
        true,
        'rekey should be true for after add'
      );
    });
  });
});
