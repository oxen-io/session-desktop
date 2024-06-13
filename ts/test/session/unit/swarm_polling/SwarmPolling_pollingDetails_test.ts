import { expect } from 'chai';
import { LegacyGroupInfo, UserGroupsGet } from 'libsession_util_nodejs';
import Sinon from 'sinon';
import { ConversationTypeEnum } from '../../../../models/conversationAttributes';
import { getSwarmPollingInstance } from '../../../../session/apis/snode_api';
import { resetHardForkCachedValues } from '../../../../session/apis/snode_api/hfHandling';
import { SwarmPolling } from '../../../../session/apis/snode_api/swarmPolling';
import { SWARM_POLLING_TIMEOUT } from '../../../../session/constants';
import { PubKey } from '../../../../session/types';
import { UserUtils } from '../../../../session/utils';
import { TestUtils } from '../../../test-utils';
import { stubData } from '../../../test-utils/utils';

describe('getPollingDetails', () => {
  // Initialize new stubbed cache
  const ourNumber = TestUtils.generateFakePubKeyStr();

  let swarmPolling: SwarmPolling;

  let clock: Sinon.SinonFakeTimers;
  beforeEach(async () => {
    TestUtils.stubWindowFeatureFlags();
    TestUtils.stubWindowLog();
    stubData('createOrUpdateItem').resolves();

    Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns(ourNumber);

    swarmPolling = getSwarmPollingInstance();
    TestUtils.stubLibSessionWorker(undefined);

    clock = Sinon.useFakeTimers({ now: Date.now(), shouldAdvanceTime: true });
  });

  afterEach(() => {
    Sinon.restore();
    clock.restore();
    resetHardForkCachedValues();
  });

  it('without anything else, we should be part of it', async () => {
    TestUtils.stubUserGroupWrapper('getAllLegacyGroups', []);
    TestUtils.stubUserGroupWrapper('getAllGroups', []);
    swarmPolling.resetSwarmPolling();

    const details = await swarmPolling.getPollingDetails([]);
    expect(details.toPollDetails.length).to.be.eq(1);
    expect(details.toPollDetails[0][0]).to.be.eq(ourNumber);
  });

  it('throws if polling entries include our pk', async () => {
    TestUtils.stubUserGroupWrapper('getAllLegacyGroups', []);
    TestUtils.stubUserGroupWrapper('getAllGroups', []);
    swarmPolling.resetSwarmPolling();

    const fn = async () =>
      swarmPolling.getPollingDetails([{ pubkey: PubKey.cast(ourNumber), lastPolledTimestamp: 0 }]);
    await expect(fn()).to.be.rejectedWith('');
  });

  describe("groups not in wrapper should be included in 'to leave' only", () => {
    it('legacy group', async () => {
      TestUtils.stubUserGroupWrapper('getAllLegacyGroups', []);
      TestUtils.stubUserGroupWrapper('getAllGroups', []);
      const groupPk = TestUtils.generateFakePubKeyStr();

      Sinon.stub(swarmPolling, 'getPollingTimeout').returns(SWARM_POLLING_TIMEOUT.ACTIVE);

      const { groupsToLeave, legacyGroupsToLeave, toPollDetails } =
        await swarmPolling.getPollingDetails([
          { pubkey: PubKey.cast(groupPk), lastPolledTimestamp: 0 },
        ]);
      expect(toPollDetails.length).to.be.eq(1);
      expect(toPollDetails[0]).to.be.deep.eq([ourNumber, ConversationTypeEnum.PRIVATE]);

      expect(legacyGroupsToLeave.length).to.be.eq(1);
      expect(legacyGroupsToLeave[0]).to.be.eq(groupPk);
      expect(groupsToLeave.length).to.be.eq(0);
    });

    it('new group NOT in wrapper should be requested for leaving', async () => {
      TestUtils.stubUserGroupWrapper('getAllLegacyGroups', []);
      TestUtils.stubUserGroupWrapper('getAllGroups', []);
      const groupPk = TestUtils.generateFakeClosedGroupV2PkStr();

      Sinon.stub(swarmPolling, 'getPollingTimeout').returns(SWARM_POLLING_TIMEOUT.ACTIVE);

      const { groupsToLeave, legacyGroupsToLeave, toPollDetails } =
        await swarmPolling.getPollingDetails([
          { pubkey: PubKey.cast(groupPk), lastPolledTimestamp: 0 },
        ]);
      expect(toPollDetails.length).to.be.eq(1);
      expect(toPollDetails[0]).to.be.deep.eq([ourNumber, ConversationTypeEnum.PRIVATE]);

      expect(groupsToLeave.length).to.be.eq(1);
      expect(groupsToLeave[0]).to.be.eq(groupPk);
      expect(legacyGroupsToLeave.length).to.be.eq(0);
    });
  });

  describe('groups in wrapper but polled recently should not be polled and not to leave neither', () => {
    it('legacy group', async () => {
      const groupPk = TestUtils.generateFakePubKeyStr();
      TestUtils.stubUserGroupWrapper('getAllLegacyGroups', [
        { pubkeyHex: groupPk } as LegacyGroupInfo,
      ]);
      TestUtils.stubUserGroupWrapper('getAllGroups', []);

      Sinon.stub(swarmPolling, 'getPollingTimeout').returns(SWARM_POLLING_TIMEOUT.ACTIVE);

      const { groupsToLeave, legacyGroupsToLeave, toPollDetails } =
        await swarmPolling.getPollingDetails([
          { pubkey: PubKey.cast(groupPk), lastPolledTimestamp: Date.now() },
        ]);
      expect(toPollDetails.length).to.be.eq(1);
      expect(toPollDetails[0]).to.be.deep.eq([ourNumber, ConversationTypeEnum.PRIVATE]);

      expect(legacyGroupsToLeave.length).to.be.eq(0);
      expect(groupsToLeave.length).to.be.eq(0);
    });

    it('new group', async () => {
      const groupPk = TestUtils.generateFakeClosedGroupV2PkStr();

      TestUtils.stubUserGroupWrapper('getAllLegacyGroups', []);
      TestUtils.stubUserGroupWrapper('getAllGroups', [{ pubkeyHex: groupPk } as UserGroupsGet]);

      Sinon.stub(swarmPolling, 'getPollingTimeout').returns(SWARM_POLLING_TIMEOUT.ACTIVE);

      const { groupsToLeave, legacyGroupsToLeave, toPollDetails } =
        await swarmPolling.getPollingDetails([
          { pubkey: PubKey.cast(groupPk), lastPolledTimestamp: Date.now() },
        ]);
      expect(toPollDetails.length).to.be.eq(1);
      expect(toPollDetails[0]).to.be.deep.eq([ourNumber, ConversationTypeEnum.PRIVATE]);
      expect(groupsToLeave.length).to.be.eq(0);
      expect(legacyGroupsToLeave.length).to.be.eq(0);
    });
  });

  describe("groups in wrapper should be included in 'to poll' only", () => {
    it('legacy group in wrapper should be polled', async () => {
      const groupPk = TestUtils.generateFakePubKeyStr();

      TestUtils.stubUserGroupWrapper('getAllLegacyGroups', [
        { pubkeyHex: groupPk } as LegacyGroupInfo,
      ]);
      TestUtils.stubUserGroupWrapper('getAllGroups', []);
      swarmPolling.resetSwarmPolling();

      Sinon.stub(swarmPolling, 'getPollingTimeout').returns(SWARM_POLLING_TIMEOUT.ACTIVE);

      const { groupsToLeave, legacyGroupsToLeave, toPollDetails } =
        await swarmPolling.getPollingDetails([
          { pubkey: PubKey.cast(groupPk), lastPolledTimestamp: 0 },
        ]);
      expect(toPollDetails.length).to.be.eq(2, 'both our and closed group should be polled');
      expect(toPollDetails[0]).to.be.deep.eq([ourNumber, ConversationTypeEnum.PRIVATE]);
      expect(toPollDetails[1]).to.be.deep.eq([groupPk, ConversationTypeEnum.GROUP]);
      // no groups to leave nor legacy ones
      expect(legacyGroupsToLeave.length).to.be.eq(0);
      expect(groupsToLeave.length).to.be.eq(0);
    });

    it('new group in wrapper should be polled', async () => {
      const groupPk = TestUtils.generateFakeClosedGroupV2PkStr();
      TestUtils.stubUserGroupWrapper('getAllLegacyGroups', []);
      TestUtils.stubUserGroupWrapper('getAllGroups', [{ pubkeyHex: groupPk } as UserGroupsGet]);

      Sinon.stub(swarmPolling, 'getPollingTimeout').returns(SWARM_POLLING_TIMEOUT.ACTIVE);

      const { groupsToLeave, legacyGroupsToLeave, toPollDetails } =
        await swarmPolling.getPollingDetails([
          { pubkey: PubKey.cast(groupPk), lastPolledTimestamp: 0 },
        ]);

      expect(toPollDetails.length).to.be.eq(2);
      expect(toPollDetails[0]).to.be.deep.eq([ourNumber, ConversationTypeEnum.PRIVATE]);
      expect(toPollDetails[1]).to.be.deep.eq([groupPk, ConversationTypeEnum.GROUPV2]);
      // no groups to leave nor legacy ones
      expect(legacyGroupsToLeave.length).to.be.eq(0);
      expect(groupsToLeave.length).to.be.eq(0);
    });
  });

  describe('multiple groups', () => {
    it('one legacy group with a few v2 group not in wrapper', async () => {
      const groupPk = TestUtils.generateFakePubKeyStr();
      const groupV2Pk = TestUtils.generateFakeClosedGroupV2PkStr();
      const groupV2Pk2 = TestUtils.generateFakeClosedGroupV2PkStr();

      TestUtils.stubUserGroupWrapper('getAllLegacyGroups', [
        { pubkeyHex: groupPk } as LegacyGroupInfo,
      ]);
      TestUtils.stubUserGroupWrapper('getAllGroups', []);
      swarmPolling.resetSwarmPolling();

      Sinon.stub(swarmPolling, 'getPollingTimeout').returns(SWARM_POLLING_TIMEOUT.ACTIVE);

      const { groupsToLeave, legacyGroupsToLeave, toPollDetails } =
        await swarmPolling.getPollingDetails([
          { pubkey: PubKey.cast(groupPk), lastPolledTimestamp: 0 },
          { pubkey: PubKey.cast(groupV2Pk), lastPolledTimestamp: 0 },
          { pubkey: PubKey.cast(groupV2Pk2), lastPolledTimestamp: 0 },
        ]);
      expect(toPollDetails.length).to.be.eq(2, 'both our and closed group should be polled');
      expect(toPollDetails[0]).to.be.deep.eq([ourNumber, ConversationTypeEnum.PRIVATE]);
      expect(toPollDetails[1]).to.be.deep.eq([groupPk, ConversationTypeEnum.GROUP]);
      expect(legacyGroupsToLeave.length).to.be.eq(0);
      expect(groupsToLeave.length).to.be.eq(2);
      expect(groupsToLeave[0]).to.be.deep.eq(groupV2Pk);
      expect(groupsToLeave[1]).to.be.deep.eq(groupV2Pk2);
    });

    it('new group in wrapper with a few legacy groups not in wrapper', async () => {
      const groupPk = TestUtils.generateFakeClosedGroupV2PkStr();
      const groupPkLeg1 = TestUtils.generateFakePubKeyStr();
      const groupPkLeg2 = TestUtils.generateFakePubKeyStr();

      TestUtils.stubUserGroupWrapper('getAllLegacyGroups', []);
      TestUtils.stubUserGroupWrapper('getAllGroups', [{ pubkeyHex: groupPk } as UserGroupsGet]);

      Sinon.stub(swarmPolling, 'getPollingTimeout').returns(SWARM_POLLING_TIMEOUT.ACTIVE);

      const { groupsToLeave, legacyGroupsToLeave, toPollDetails } =
        await swarmPolling.getPollingDetails([
          { pubkey: PubKey.cast(groupPk), lastPolledTimestamp: 0 },
          { pubkey: PubKey.cast(groupPkLeg1), lastPolledTimestamp: 0 },
          { pubkey: PubKey.cast(groupPkLeg2), lastPolledTimestamp: 0 },
        ]);

      expect(toPollDetails.length).to.be.eq(2);
      expect(toPollDetails[0]).to.be.deep.eq([ourNumber, ConversationTypeEnum.PRIVATE]);
      expect(toPollDetails[1]).to.be.deep.eq([groupPk, ConversationTypeEnum.GROUPV2]);
      expect(legacyGroupsToLeave.length).to.be.eq(2);
      expect(legacyGroupsToLeave[0]).to.be.eq(groupPkLeg1);
      expect(legacyGroupsToLeave[1]).to.be.eq(groupPkLeg2);
      expect(groupsToLeave.length).to.be.eq(0);
    });

    it('two of each, all should be polled', async () => {
      const groupPk1 = TestUtils.generateFakeClosedGroupV2PkStr();
      const groupPk2 = TestUtils.generateFakeClosedGroupV2PkStr();
      const groupPkLeg1 = TestUtils.generateFakePubKeyStr();
      const groupPkLeg2 = TestUtils.generateFakePubKeyStr();

      TestUtils.stubUserGroupWrapper('getAllLegacyGroups', [
        { pubkeyHex: groupPkLeg1 } as LegacyGroupInfo,
        { pubkeyHex: groupPkLeg2 } as LegacyGroupInfo,
      ]);
      TestUtils.stubUserGroupWrapper('getAllGroups', [
        { pubkeyHex: groupPk1 } as UserGroupsGet,
        { pubkeyHex: groupPk2 } as UserGroupsGet,
      ]);

      Sinon.stub(swarmPolling, 'getPollingTimeout').returns(SWARM_POLLING_TIMEOUT.ACTIVE);

      const { groupsToLeave, legacyGroupsToLeave, toPollDetails } =
        await swarmPolling.getPollingDetails([
          { pubkey: PubKey.cast(groupPk1), lastPolledTimestamp: 0 },
          { pubkey: PubKey.cast(groupPk2), lastPolledTimestamp: 0 },
          { pubkey: PubKey.cast(groupPkLeg1), lastPolledTimestamp: 0 },
          { pubkey: PubKey.cast(groupPkLeg2), lastPolledTimestamp: 0 },
        ]);

      expect(toPollDetails.length).to.be.eq(5);
      expect(toPollDetails[0]).to.be.deep.eq([ourNumber, ConversationTypeEnum.PRIVATE]);
      expect(toPollDetails[1]).to.be.deep.eq([groupPkLeg1, ConversationTypeEnum.GROUP]);
      expect(toPollDetails[2]).to.be.deep.eq([groupPkLeg2, ConversationTypeEnum.GROUP]);
      expect(toPollDetails[3]).to.be.deep.eq([groupPk1, ConversationTypeEnum.GROUPV2]);
      expect(toPollDetails[4]).to.be.deep.eq([groupPk2, ConversationTypeEnum.GROUPV2]);

      // no groups to leave nor legacy ones
      expect(legacyGroupsToLeave.length).to.be.eq(0);
      expect(groupsToLeave.length).to.be.eq(0);
    });
  });
});
