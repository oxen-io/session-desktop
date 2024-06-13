import { expect } from 'chai';
import { GroupPubkeyType, PubkeyType } from 'libsession_util_nodejs';
import { randombytes_buf } from 'libsodium-wrappers-sumo';
import Long from 'long';
import Sinon from 'sinon';
import { ConfigDumpData } from '../../../../data/configDump/configDump';
import { GetNetworkTime } from '../../../../session/apis/snode_api/getNetworkTime';
import { SnodeNamespaces } from '../../../../session/apis/snode_api/namespaces';
import { UserUtils } from '../../../../session/utils';
import { LibSessionUtil } from '../../../../session/utils/libsession/libsession_utils';
import {
  GenericWrapperActions,
  MetaGroupWrapperActions,
} from '../../../../webworker/workers/browser/libsession_worker_interface';
import { TestUtils } from '../../../test-utils';

describe('LibSessionUtil saveDumpsToDb', () => {
  describe('for group', () => {
    let groupPk: GroupPubkeyType;

    beforeEach(() => {
      groupPk = TestUtils.generateFakeClosedGroupV2PkStr();
    });

    afterEach(() => {
      Sinon.restore();
    });

    it('does not save to DB if needsDump reports false', async () => {
      Sinon.stub(MetaGroupWrapperActions, 'needsDump').resolves(false);
      const metaDump = Sinon.stub(MetaGroupWrapperActions, 'metaDump').resolves(new Uint8Array());
      const saveConfigDump = Sinon.stub(ConfigDumpData, 'saveConfigDump').resolves();
      await LibSessionUtil.saveDumpsToDb(groupPk);
      expect(saveConfigDump.callCount).to.be.equal(0);
      expect(metaDump.callCount).to.be.equal(0);
    });

    it('does save to DB if needsDump reports true', async () => {
      Sinon.stub(MetaGroupWrapperActions, 'needsDump').resolves(true);
      const dump = [1, 2, 3, 4, 5];
      const metaDump = Sinon.stub(MetaGroupWrapperActions, 'metaDump').resolves(
        new Uint8Array(dump)
      );
      const saveConfigDump = Sinon.stub(ConfigDumpData, 'saveConfigDump').resolves();
      await LibSessionUtil.saveDumpsToDb(groupPk);
      expect(saveConfigDump.callCount).to.be.equal(1);
      expect(metaDump.callCount).to.be.equal(1);
      expect(metaDump.firstCall.args).to.be.deep.eq([groupPk]);
      expect(saveConfigDump.firstCall.args).to.be.deep.eq([
        {
          publicKey: groupPk,
          variant: `MetaGroupConfig-${groupPk}`,
          data: new Uint8Array(dump),
        },
      ]);
    });
  });

  describe('for user', () => {
    let userDetails: TestUtils.TestUserKeyPairs;
    let sessionId: PubkeyType;

    beforeEach(async () => {
      userDetails = await TestUtils.generateUserKeyPairs();
      sessionId = userDetails.x25519KeyPair.pubkeyHex;
    });

    afterEach(() => {
      Sinon.restore();
    });

    it('does not save to DB if all needsDump reports false', async () => {
      Sinon.stub(GenericWrapperActions, 'needsDump').resolves(false);
      const dump = Sinon.stub(GenericWrapperActions, 'dump').resolves(new Uint8Array());
      const saveConfigDump = Sinon.stub(ConfigDumpData, 'saveConfigDump').resolves();
      Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns(sessionId);

      await LibSessionUtil.saveDumpsToDb(sessionId);
      expect(saveConfigDump.callCount).to.be.equal(0);
      expect(dump.callCount).to.be.equal(0);
    });

    it('does save to DB if any needsDump reports true', async () => {
      Sinon.stub(GenericWrapperActions, 'needsDump')
        .resolves(false)
        .withArgs('ConvoInfoVolatileConfig')
        .resolves(true);
      const dump = Sinon.stub(GenericWrapperActions, 'dump').resolves(new Uint8Array());
      const saveConfigDump = Sinon.stub(ConfigDumpData, 'saveConfigDump').resolves();
      Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns(sessionId);

      await LibSessionUtil.saveDumpsToDb(sessionId);
      expect(saveConfigDump.callCount).to.be.equal(1);
      expect(dump.callCount).to.be.equal(1);
    });

    it('does save to DB if all needsDump reports true', async () => {
      const needsDump = Sinon.stub(GenericWrapperActions, 'needsDump').resolves(true);
      const dumped = new Uint8Array([1, 2, 3]);
      const dump = Sinon.stub(GenericWrapperActions, 'dump').resolves(dumped);
      const saveConfigDump = Sinon.stub(ConfigDumpData, 'saveConfigDump').resolves();
      Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns(sessionId);

      await LibSessionUtil.saveDumpsToDb(userDetails.x25519KeyPair.pubkeyHex);
      expect(needsDump.callCount).to.be.equal(4);
      expect(dump.callCount).to.be.equal(4);
      expect(needsDump.getCalls().map(call => call.args)).to.be.deep.eq([
        ['UserConfig'],
        ['ContactsConfig'],
        ['UserGroupsConfig'],
        ['ConvoInfoVolatileConfig'],
      ]);
      expect(saveConfigDump.callCount).to.be.equal(4);

      expect(saveConfigDump.getCalls().map(call => call.args)).to.be.deep.eq([
        [{ variant: 'UserConfig', publicKey: sessionId, data: dumped }],
        [{ variant: 'ContactsConfig', publicKey: sessionId, data: dumped }],
        [{ variant: 'UserGroupsConfig', publicKey: sessionId, data: dumped }],
        [{ variant: 'ConvoInfoVolatileConfig', publicKey: sessionId, data: dumped }],
      ]);

      expect(dump.getCalls().map(call => call.args)).to.be.deep.eq([
        ['UserConfig'],
        ['ContactsConfig'],
        ['UserGroupsConfig'],
        ['ConvoInfoVolatileConfig'],
      ]);
    });
  });
});

describe('LibSessionUtil pendingChangesForGroup', () => {
  let groupPk: GroupPubkeyType;
  beforeEach(() => {
    groupPk = TestUtils.generateFakeClosedGroupV2PkStr();
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('empty results if needsPush is false', async () => {
    Sinon.stub(MetaGroupWrapperActions, 'needsPush').resolves(false);
    const result = await LibSessionUtil.pendingChangesForGroup(groupPk);
    expect(result.allOldHashes.size).to.be.equal(0);
    expect(result.messages.length).to.be.equal(0);
  });

  it('valid results if needsPush is true', async () => {
    const pushResults = {
      groupKeys: { data: new Uint8Array([3, 2, 1]), namespace: 13 },
      groupInfo: {
        seqno: 1,
        data: new Uint8Array([1, 2, 3]),
        hashes: ['123', '333'],
        namespace: 12,
      },
      groupMember: {
        seqno: 2,
        data: new Uint8Array([1, 2]),
        hashes: ['321', '111'],
        namespace: 14,
      },
    };
    Sinon.stub(MetaGroupWrapperActions, 'needsPush').resolves(true);
    Sinon.stub(MetaGroupWrapperActions, 'push').resolves(pushResults);
    Sinon.stub(GetNetworkTime, 'now').returns(1234);
    const result = await LibSessionUtil.pendingChangesForGroup(groupPk);
    expect(result.allOldHashes.size).to.be.equal(4);
    // check that all of the hashes are there
    expect([...result.allOldHashes]).to.have.members([
      ...pushResults.groupInfo.hashes,
      ...pushResults.groupMember.hashes,
    ]);

    expect(result.messages.length).to.be.equal(3);
    // check for the keys push content
    expect(result.messages[0]).to.be.deep.eq({
      type: 'GroupKeys',
      ciphertext: new Uint8Array([3, 2, 1]),
      namespace: 13,
    });
    // check for the info push content
    expect(result.messages[1]).to.be.deep.eq({
      type: 'GroupInfo',
      ciphertext: new Uint8Array([1, 2, 3]),
      namespace: 12,
      seqno: Long.fromInt(pushResults.groupInfo.seqno),
    });
    // check for the members pusu content
    expect(result.messages[2]).to.be.deep.eq({
      type: 'GroupMember',
      ciphertext: new Uint8Array([1, 2]),
      namespace: 14,
      seqno: Long.fromInt(pushResults.groupMember.seqno),
    });
  });

  it('skips entry results if needsPush one of the wrapper has no changes', async () => {
    const pushResults = {
      groupInfo: {
        seqno: 1,
        data: new Uint8Array([1, 2, 3]),
        hashes: ['123', '333'],
        namespace: 12,
      },
      groupMember: null,
      groupKeys: { data: new Uint8Array([3, 2, 1]), namespace: 13 },
    };
    Sinon.stub(MetaGroupWrapperActions, 'needsPush').resolves(true);
    Sinon.stub(MetaGroupWrapperActions, 'push').resolves(pushResults);
    const result = await LibSessionUtil.pendingChangesForGroup(groupPk);
    expect(result.allOldHashes.size).to.be.equal(2);
    expect(result.messages.length).to.be.equal(2);
  });
});

describe('LibSessionUtil pendingChangesForUs', () => {
  beforeEach(async () => {});

  afterEach(() => {
    Sinon.restore();
  });

  it('empty results if all needsPush is false', async () => {
    Sinon.stub(GenericWrapperActions, 'needsPush').resolves(false);
    const result = await LibSessionUtil.pendingChangesForUs();
    expect(result.allOldHashes.size).to.be.equal(0);
    expect(result.messages.length).to.be.equal(0);
  });

  it('valid results if ConvoVolatile needsPush only is true', async () => {
    // this is what would be supposedly returned by libsession
    const pushResultsConvo = {
      data: randombytes_buf(300),
      seqno: 123,
      hashes: ['123'],
      namespace: SnodeNamespaces.ConvoInfoVolatile,
    };
    const needsPush = Sinon.stub(GenericWrapperActions, 'needsPush');
    needsPush.resolves(false).withArgs('ConvoInfoVolatileConfig').resolves(true);

    const push = Sinon.stub(GenericWrapperActions, 'push')
      .throws()
      .withArgs('ConvoInfoVolatileConfig')
      .resolves(pushResultsConvo);

    Sinon.stub(GetNetworkTime, 'now').returns(1234);
    const result = await LibSessionUtil.pendingChangesForUs();
    expect(needsPush.callCount).to.be.eq(4);
    expect(needsPush.getCalls().map(m => m.args)).to.be.deep.eq([
      ['UserConfig'],
      ['ContactsConfig'],
      ['UserGroupsConfig'],
      ['ConvoInfoVolatileConfig'],
    ]);

    expect(push.callCount).to.be.eq(1);
    expect(push.getCalls().map(m => m.args)).to.be.deep.eq([['ConvoInfoVolatileConfig']]);

    // check that all of the hashes are there
    expect(result.allOldHashes.size).to.be.equal(1);
    expect([...result.allOldHashes]).to.have.members([...pushResultsConvo.hashes]);

    // check for the messages to push are what we expect
    expect(result.messages).to.be.deep.eq([
      {
        ciphertext: pushResultsConvo.data,
        namespace: pushResultsConvo.namespace,
        seqno: Long.fromNumber(pushResultsConvo.seqno),
      },
    ]);
  });

  it('valid results if all wrappers needsPush only are true', async () => {
    // this is what would be supposedly returned by libsession
    const pushConvo = {
      data: randombytes_buf(300),
      seqno: 123,
      hashes: ['123'],
      namespace: SnodeNamespaces.ConvoInfoVolatile,
    };
    const pushContacts = {
      data: randombytes_buf(300),
      seqno: 321,
      hashes: ['321', '4444'],
      namespace: SnodeNamespaces.UserContacts,
    };
    const pushGroups = {
      data: randombytes_buf(300),
      seqno: 222,
      hashes: ['222', '5555'],
      namespace: SnodeNamespaces.UserGroups,
    };
    const pushUser = {
      data: randombytes_buf(300),
      seqno: 111,
      hashes: ['111'],
      namespace: SnodeNamespaces.UserProfile,
    };
    const needsPush = Sinon.stub(GenericWrapperActions, 'needsPush');
    needsPush.resolves(true);

    const push = Sinon.stub(GenericWrapperActions, 'push');
    push
      .throws()
      .withArgs('ContactsConfig')
      .resolves(pushContacts)
      .withArgs('UserConfig')
      .resolves(pushUser)
      .withArgs('UserGroupsConfig')
      .resolves(pushGroups)
      .withArgs('ConvoInfoVolatileConfig')
      .resolves(pushConvo);

    Sinon.stub(GetNetworkTime, 'now').returns(1234);
    const result = await LibSessionUtil.pendingChangesForUs();
    expect(needsPush.callCount).to.be.eq(4);
    expect(needsPush.getCalls().map(m => m.args)).to.be.deep.eq([
      ['UserConfig'],
      ['ContactsConfig'],
      ['UserGroupsConfig'],
      ['ConvoInfoVolatileConfig'],
    ]);

    expect(push.callCount).to.be.eq(4);
    expect(push.getCalls().map(m => m.args)).to.be.deep.eq([
      ['UserConfig'],
      ['ContactsConfig'],
      ['UserGroupsConfig'],
      ['ConvoInfoVolatileConfig'],
    ]);

    // check that all of the hashes are there
    expect(result.allOldHashes.size).to.be.equal(6);
    expect([...result.allOldHashes]).to.have.members([
      ...pushContacts.hashes,
      ...pushConvo.hashes,
      ...pushGroups.hashes,
      ...pushUser.hashes,
    ]);

    // check for the messages to push are what we expect
    expect(result.messages).to.be.deep.eq(
      [pushUser, pushContacts, pushGroups, pushConvo].map(m => ({
        ciphertext: m.data,
        namespace: m.namespace,
        seqno: Long.fromNumber(m.seqno),
      }))
    );
  });
});
