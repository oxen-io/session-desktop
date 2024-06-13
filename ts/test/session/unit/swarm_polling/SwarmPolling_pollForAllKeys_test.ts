import chai from 'chai';
import { describe } from 'mocha';
import Sinon, * as sinon from 'sinon';

import {
  GroupPubkeyType,
  LegacyGroupInfo,
  PubkeyType,
  UserGroupsGet,
} from 'libsession_util_nodejs';
import { ConversationModel, Convo } from '../../../../models/conversation';
import { ConversationTypeEnum } from '../../../../models/conversationAttributes';
import { getSwarmPollingInstance } from '../../../../session/apis/snode_api';
import { resetHardForkCachedValues } from '../../../../session/apis/snode_api/hfHandling';
import { SnodeAPIRetrieve } from '../../../../session/apis/snode_api/retrieveRequest';
import { SnodePool } from '../../../../session/apis/snode_api/snodePool';
import { SwarmPolling } from '../../../../session/apis/snode_api/swarmPolling';
import { ConvoHub } from '../../../../session/conversations';
import { PubKey } from '../../../../session/types';
import { UserUtils } from '../../../../session/utils';
import { sleepFor } from '../../../../session/utils/Promise';
import { UserSync } from '../../../../session/utils/job_runners/jobs/UserSyncJob';
import { TestUtils } from '../../../test-utils';
import { generateFakeSnodes, stubData } from '../../../test-utils/utils';

const { expect } = chai;

const pollOnceForUsArgs = (us: string) => [[us, ConversationTypeEnum.PRIVATE]];
const pollOnceForGroupLegacyArgs = (groupLegacy: string) => [
  [groupLegacy, ConversationTypeEnum.GROUP],
];

const pollOnceForGroupArgs = (group: GroupPubkeyType) => [[group, ConversationTypeEnum.GROUPV2]];

function stubWithLegacyGroups(pubkeys: Array<string>) {
  const groups = pubkeys.map(m => ({ pubkeyHex: m }) as LegacyGroupInfo);
  TestUtils.stubUserGroupWrapper('getAllLegacyGroups', groups);
}

function stubWithGroups(pubkeys: Array<GroupPubkeyType>) {
  const groups = pubkeys.map(m => ({ pubkeyHex: m }) as UserGroupsGet);
  TestUtils.stubUserGroupWrapper('getAllGroups', groups);
}

describe('SwarmPolling:pollForAllKeys', () => {
  const ourPubkey = TestUtils.generateFakePubKey();
  const ourNumber = ourPubkey.key as PubkeyType;

  let pollOnceForKeySpy: Sinon.SinonSpy<
    Parameters<SwarmPolling['pollOnceForKey']>,
    ReturnType<SwarmPolling['pollOnceForKey']>
  >;
  let swarmPolling: SwarmPolling;
  let getItemByIdStub: Sinon.SinonStub;
  let clock: Sinon.SinonFakeTimers;

  beforeEach(async () => {
    ConvoHub.use().reset();
    TestUtils.stubWindowFeatureFlags();
    TestUtils.stubWindowLog();
    Sinon.stub(UserSync, 'queueNewJobIfNeeded').resolves();

    // Utils Stubs
    Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns(ourNumber);

    stubData('getAllConversations').resolves([]);
    getItemByIdStub = TestUtils.stubData('getItemById');
    stubData('saveConversation').resolves();
    stubData('getSwarmNodesForPubkey').resolves();
    stubData('getLastHashBySnode').resolves();

    Sinon.stub(Convo, 'commitConversationAndRefreshWrapper').resolves();

    TestUtils.stubLibSessionWorker(undefined);

    Sinon.stub(SnodePool, 'getSwarmFor').resolves(generateFakeSnodes(5));
    Sinon.stub(SnodeAPIRetrieve, 'retrieveNextMessagesNoRetries').resolves([]);

    TestUtils.stubWindow('inboxStore', undefined);
    TestUtils.stubWindow('getGlobalOnlineStatus', () => true);
    TestUtils.stubWindowLog();

    const convoController = ConvoHub.use();
    await convoController.load();
    ConvoHub.use().getOrCreate(ourPubkey.key, ConversationTypeEnum.PRIVATE);

    swarmPolling = getSwarmPollingInstance();
    swarmPolling.resetSwarmPolling();
    pollOnceForKeySpy = Sinon.spy(swarmPolling, 'pollOnceForKey');

    clock = sinon.useFakeTimers({ now: Date.now(), shouldAdvanceTime: true });
    stubData('createOrUpdateItem').resolves();
  });

  afterEach(() => {
    Sinon.restore();
    ConvoHub.use().reset();
    clock.restore();
    resetHardForkCachedValues();
  });

  it('does run for our pubkey even if activeAt is really old ', async () => {
    stubWithGroups([]);
    stubWithLegacyGroups([]);
    const convo = ConvoHub.use().getOrCreate(ourNumber, ConversationTypeEnum.PRIVATE);
    convo.set('active_at', Date.now() - 1000 * 3600 * 25);
    await swarmPolling.start(true);

    expect(pollOnceForKeySpy.callCount).to.eq(1);
    expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
  });

  it('does run for our pubkey even if activeAt is recent ', async () => {
    stubWithGroups([]);
    stubWithLegacyGroups([]);
    const convo = ConvoHub.use().getOrCreate(ourNumber, ConversationTypeEnum.PRIVATE);
    convo.set('active_at', Date.now());
    await swarmPolling.start(true);

    expect(pollOnceForKeySpy.callCount).to.eq(1);
    expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
  });

  describe('legacy group', () => {
    it('does run for group pubkey on start no matter the recent timestamp', async () => {
      const groupPk = TestUtils.generateFakePubKeyStr();
      const convo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUP);
      stubWithLegacyGroups([groupPk]);
      stubWithGroups([]);
      convo.set('active_at', Date.now());
      const groupConvoPubkey = PubKey.cast(groupPk);
      swarmPolling.addGroupId(groupConvoPubkey);
      await swarmPolling.start(true);

      // our pubkey will be polled for, hence the 2
      expect(pollOnceForKeySpy.callCount).to.eq(2);

      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupLegacyArgs(groupPk));
    });

    it('does only poll from -10 for closed groups', async () => {
      const groupPk = TestUtils.generateFakePubKeyStr();
      const convo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUP);

      stubWithLegacyGroups([groupPk]);
      stubWithGroups([]);
      convo.set('active_at', 1);
      swarmPolling.addGroupId(PubKey.cast(groupPk));

      await swarmPolling.start(true);

      // our pubkey will be polled for, hence the 2
      expect(pollOnceForKeySpy.callCount).to.eq(2);
      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupLegacyArgs(groupPk));
      getItemByIdStub.restore();
      getItemByIdStub = TestUtils.stubData('getItemById');

      getItemByIdStub.resolves();
    });

    it('does run for group pubkey on start but not another time if activeAt is old ', async () => {
      const groupPk = TestUtils.generateFakePubKeyStr();
      const groupConvo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUP);

      stubWithLegacyGroups([groupPk]);
      stubWithGroups([]);

      groupConvo.set('active_at', 1); // really old, but active
      swarmPolling.addGroupId(groupPk);
      // this calls the stub 2 times, one for our direct pubkey and one for the group
      await swarmPolling.start(true);
      expect(pollOnceForKeySpy.callCount).to.eq(2);
      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupLegacyArgs(groupPk));
      // this should only call the stub one more time: for our direct pubkey but not for the group pubkey
      await swarmPolling.pollForAllKeys();
      expect(pollOnceForKeySpy.callCount).to.eq(3);
      expect(pollOnceForKeySpy.thirdCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
    });

    it('does run twice if activeAt less than one hour ', async () => {
      const groupPk = TestUtils.generateFakePubKeyStr();

      const convo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUP);
      // fake that the group is part of the wrapper otherwise we stop tracking it after the first polling event
      stubWithLegacyGroups([groupPk]);
      stubWithGroups([]);

      convo.set('active_at', Date.now());
      swarmPolling.addGroupId(groupPk);
      await swarmPolling.start(true);
      expect(pollOnceForKeySpy.callCount).to.eq(2);
      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupLegacyArgs(groupPk));
      pollOnceForKeySpy.resetHistory();
      clock.tick(9000);

      // no need to do that as the tick will trigger a call in all cases after 5 secs await swarmPolling.pollForAllKeys();
      /** this is not easy to explain, but
       * - during the swarmPolling.start, we get two calls to pollOnceForKeySpy (one for our id and one for group id)
       * - the clock ticks 9sec, and another call of pollOnceForKeySpy get started, but as we do not await them, this test fails.
       * the only fix is to restore the clock and force the a small sleep to let the thing run in bg
       */

      await sleepFor(10);

      expect(pollOnceForKeySpy.callCount).to.eq(2);
      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupLegacyArgs(groupPk));
    });

    it('does run twice if activeAt is inactive and we tick longer than 2 minutes', async () => {
      const groupPk = TestUtils.generateFakePubKeyStr();

      const convo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUP);
      // fake that the group is part of the wrapper otherwise we stop tracking it after the first polling event

      stubWithLegacyGroups([groupPk]);
      stubWithGroups([]);
      pollOnceForKeySpy.resetHistory();
      convo.set('active_at', Date.now());
      swarmPolling.addGroupId(groupPk);
      // this call the stub two times already, one for our direct pubkey and one for the group
      await swarmPolling.start(true);
      const timeToTick = 3 * 60 * 1000;
      swarmPolling.forcePolledTimestamp(groupPk, Date.now() - timeToTick);
      // more than week old, so inactive group but we have to tick after more than 2 min
      convo.set('active_at', Date.now() - 7 * 25 * 3600 * 1000);
      clock.tick(timeToTick);
      /** this is not easy to explain, but
       * - during the swarmPolling.start, we get two calls to pollOnceForKeySpy (one for our id and one for group od)
       * - the clock ticks 9sec, and another call of pollOnceForKeySpy get started, but as we do not await them, this test fails.
       * the only fix is to restore the clock and force the a small sleep to let the thing run in bg
       */
      await sleepFor(10);
      // we should have two more calls here, so 4 total.
      expect(pollOnceForKeySpy.callCount).to.eq(4);
      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupLegacyArgs(groupPk));
      expect(pollOnceForKeySpy.thirdCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.getCalls()[3].args).to.deep.eq(pollOnceForGroupLegacyArgs(groupPk));
    });

    it('does run once only if group is inactive and we tick less than 2 minutes ', async () => {
      const groupPk = TestUtils.generateFakePubKeyStr();

      const convo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUP);
      pollOnceForKeySpy.resetHistory();

      stubWithLegacyGroups([groupPk]);
      stubWithGroups([]);

      convo.set('active_at', Date.now());
      swarmPolling.addGroupId(groupPk);
      await swarmPolling.start(true);

      // more than a week old, we should not tick after just 5 seconds
      convo.set('active_at', Date.now() - 7 * 24 * 3600 * 1000 - 3600 * 1000);

      clock.tick(1 * 60 * 1000);
      await sleepFor(10);

      // we should have only one more call here, the one for our direct pubkey fetch
      expect(pollOnceForKeySpy.callCount).to.eq(3);
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupLegacyArgs(groupPk)); // this one comes from the swarmPolling.start
      expect(pollOnceForKeySpy.thirdCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
    });

    describe('multiple runs', () => {
      let convo: ConversationModel;
      let groupConvoPubkey: PubKey;

      beforeEach(async () => {
        convo = ConvoHub.use().getOrCreate(
          TestUtils.generateFakePubKeyStr(),
          ConversationTypeEnum.GROUP
        );

        stubWithLegacyGroups([convo.id]);
        stubWithGroups([]);

        convo.set('active_at', Date.now());
        groupConvoPubkey = PubKey.cast(convo.id as string);
        swarmPolling.addGroupId(groupConvoPubkey);
        await swarmPolling.start(true);
      });

      afterEach(() => {
        Sinon.restore();
        ConvoHub.use().reset();
        clock.restore();
        resetHardForkCachedValues();
      });

      it('does run twice if activeAt is less than 2 days', async () => {
        pollOnceForKeySpy.resetHistory();
        // less than 2 days old, this is an active group
        convo.set('active_at', Date.now() - 2 * 24 * 3600 * 1000 - 3600 * 1000);

        const timeToTick = 6 * 1000;

        swarmPolling.forcePolledTimestamp(convo.id, timeToTick);
        // we tick more than 5 sec
        clock.tick(timeToTick);

        await swarmPolling.pollForAllKeys();
        // we have 4 calls total. 2 for our direct promises run each 5 seconds, and 2 for the group pubkey active (so run every 5 sec too)
        expect(pollOnceForKeySpy.callCount).to.eq(4);
        // first two calls are our pubkey
        expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
        expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(
          pollOnceForGroupLegacyArgs(groupConvoPubkey.key)
        );

        expect(pollOnceForKeySpy.thirdCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
        expect(pollOnceForKeySpy.getCalls()[3].args).to.deep.eq(
          pollOnceForGroupLegacyArgs(groupConvoPubkey.key)
        );
      });

      it('does run twice if activeAt is more than 2 days old and we tick more than one minute', async () => {
        pollOnceForKeySpy.resetHistory();
        TestUtils.stubWindowLog();
        convo.set('active_at', Date.now() - 2 * 25 * 3600 * 1000); // medium active
        // fake that the group is part of the wrapper otherwise we stop tracking it after the first polling event

        const timeToTick = 65 * 1000; // more than one minute
        swarmPolling.forcePolledTimestamp(convo.id, timeToTick);
        clock.tick(timeToTick); // should tick twice more (one more our direct pubkey and one for the group)

        // fake that the group is part of the wrapper otherwise we stop tracking it after the first polling event

        await swarmPolling.pollForAllKeys();

        expect(pollOnceForKeySpy.callCount).to.eq(4);

        // first two calls are our pubkey
        expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
        expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(
          pollOnceForGroupLegacyArgs(groupConvoPubkey.key)
        );
        expect(pollOnceForKeySpy.thirdCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
        expect(pollOnceForKeySpy.getCalls()[3].args).to.deep.eq(
          pollOnceForGroupLegacyArgs(groupConvoPubkey.key)
        );
      });
    });
  });

  describe('03 group', () => {
    it('does run for group pubkey on start no matter the recent timestamp', async () => {
      const groupPk = TestUtils.generateFakeClosedGroupV2PkStr();
      const convo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUPV2);
      stubWithLegacyGroups([]);
      stubWithGroups([groupPk]);
      convo.set('active_at', Date.now());
      const groupConvoPubkey = PubKey.cast(groupPk);
      swarmPolling.addGroupId(groupConvoPubkey);
      await swarmPolling.start(true);

      // our pubkey will be polled for, hence the 2
      expect(pollOnceForKeySpy.callCount).to.eq(2);

      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupArgs(groupPk));
    });

    it('does only poll from -10 for closed groups', async () => {
      const groupPk = TestUtils.generateFakeClosedGroupV2PkStr();
      const convo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUPV2);
      stubWithLegacyGroups([]);
      stubWithGroups([groupPk]);
      convo.set('active_at', 1);
      swarmPolling.addGroupId(PubKey.cast(groupPk));

      await swarmPolling.start(true);

      // our pubkey will be polled for, hence the 2
      expect(pollOnceForKeySpy.callCount).to.eq(2);
      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupArgs(groupPk));
      getItemByIdStub.restore();
      getItemByIdStub = TestUtils.stubData('getItemById');

      getItemByIdStub.resolves();
    });

    it('does run for group pubkey on start but not another time if activeAt is old ', async () => {
      const groupPk = TestUtils.generateFakeClosedGroupV2PkStr();
      const convo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUPV2);
      stubWithLegacyGroups([]);
      stubWithGroups([groupPk]);

      convo.set('active_at', 1); // really old, but active
      swarmPolling.addGroupId(groupPk);
      // this calls the stub 2 times, one for our direct pubkey and one for the group
      await swarmPolling.start(true);
      expect(pollOnceForKeySpy.callCount).to.eq(2);
      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupArgs(groupPk));
      // this should only call the stub one more time: for our direct pubkey but not for the group pubkey
      await swarmPolling.pollForAllKeys();
      expect(pollOnceForKeySpy.callCount).to.eq(3);
      expect(pollOnceForKeySpy.thirdCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
    });

    it('does run twice if activeAt less than one hour ', async () => {
      const groupPk = TestUtils.generateFakeClosedGroupV2PkStr();
      const convo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUPV2);
      stubWithLegacyGroups([]);
      stubWithGroups([groupPk]);

      convo.set('active_at', Date.now());
      swarmPolling.addGroupId(groupPk);
      await swarmPolling.start(true);
      expect(pollOnceForKeySpy.callCount).to.eq(2);
      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupArgs(groupPk));
      pollOnceForKeySpy.resetHistory();
      clock.tick(9000);

      // no need to do that as the tick will trigger a call in all cases after 5 secs await swarmPolling.pollForAllKeys();
      /** this is not easy to explain, but
       * - during the swarmPolling.start, we get two calls to pollOnceForKeySpy (one for our id and one for group id)
       * - the clock ticks 9sec, and another call of pollOnceForKeySpy get started, but as we do not await them, this test fails.
       * the only fix is to restore the clock and force the a small sleep to let the thing run in bg
       */

      await sleepFor(10);

      expect(pollOnceForKeySpy.callCount).to.eq(2);
      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupArgs(groupPk));
    });

    it('does run twice if activeAt is inactive and we tick longer than 2 minutes', async () => {
      const groupPk = TestUtils.generateFakeClosedGroupV2PkStr();
      const convo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUPV2);
      stubWithLegacyGroups([]);
      stubWithGroups([groupPk]);

      pollOnceForKeySpy.resetHistory();
      convo.set('active_at', Date.now());
      swarmPolling.addGroupId(groupPk);
      // this call the stub two times already, one for our direct pubkey and one for the group
      await swarmPolling.start(true);
      const timeToTick = 3 * 60 * 1000;
      swarmPolling.forcePolledTimestamp(groupPk, Date.now() - timeToTick);
      // more than week old, so inactive group but we have to tick after more than 2 min
      convo.set('active_at', Date.now() - 7 * 25 * 3600 * 1000);
      clock.tick(timeToTick);
      /** this is not easy to explain, but
       * - during the swarmPolling.start, we get two calls to pollOnceForKeySpy (one for our id and one for group od)
       * - the clock ticks 9sec, and another call of pollOnceForKeySpy get started, but as we do not await them, this test fails.
       * the only fix is to restore the clock and force the a small sleep to let the thing run in bg
       */
      await sleepFor(10);
      // we should have two more calls here, so 4 total.
      expect(pollOnceForKeySpy.callCount).to.eq(4);
      expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupArgs(groupPk));
      expect(pollOnceForKeySpy.thirdCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
      expect(pollOnceForKeySpy.getCalls()[3].args).to.deep.eq(pollOnceForGroupArgs(groupPk));
    });

    it('does run once only if group is inactive and we tick less than 2 minutes ', async () => {
      const groupPk = TestUtils.generateFakeClosedGroupV2PkStr();
      const convo = ConvoHub.use().getOrCreate(groupPk, ConversationTypeEnum.GROUPV2);
      stubWithLegacyGroups([]);
      stubWithGroups([groupPk]);

      convo.set('active_at', Date.now());
      swarmPolling.addGroupId(groupPk);
      await swarmPolling.start(true);

      // more than a week old, we should not tick after just 5 seconds
      convo.set('active_at', Date.now() - 7 * 24 * 3600 * 1000 - 3600 * 1000);

      clock.tick(1 * 60 * 1000);
      await sleepFor(10);

      // we should have only one more call here, the one for our direct pubkey fetch
      expect(pollOnceForKeySpy.callCount).to.eq(3);
      expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(pollOnceForGroupArgs(groupPk)); // this one comes from the swarmPolling.start
      expect(pollOnceForKeySpy.thirdCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
    });

    describe('multiple runs', () => {
      let convo: ConversationModel;
      let groupConvoPubkey: PubKey;

      beforeEach(async () => {
        convo = ConvoHub.use().getOrCreate(
          TestUtils.generateFakeClosedGroupV2PkStr(),
          ConversationTypeEnum.GROUPV2
        );

        stubWithLegacyGroups([]);
        stubWithGroups([convo.id as GroupPubkeyType]);

        convo.set('active_at', Date.now());
        groupConvoPubkey = PubKey.cast(convo.id as string);
        swarmPolling.addGroupId(groupConvoPubkey);
        await swarmPolling.start(true);
      });

      afterEach(() => {
        Sinon.restore();
        ConvoHub.use().reset();
        clock.restore();
        resetHardForkCachedValues();
      });

      it('does run twice if activeAt is less than 2 days', async () => {
        pollOnceForKeySpy.resetHistory();
        // less than 2 days old, this is an active group
        convo.set('active_at', Date.now() - 2 * 24 * 3600 * 1000 - 3600 * 1000);

        const timeToTick = 6 * 1000;

        swarmPolling.forcePolledTimestamp(convo.id, timeToTick);
        // we tick more than 5 sec
        clock.tick(timeToTick);

        await swarmPolling.pollForAllKeys();
        // we have 4 calls total. 2 for our direct promises run each 5 seconds, and 2 for the group pubkey active (so run every 5 sec too)
        expect(pollOnceForKeySpy.callCount).to.eq(4);
        // first two calls are our pubkey
        expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
        expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(
          pollOnceForGroupArgs(groupConvoPubkey.key as GroupPubkeyType)
        );

        expect(pollOnceForKeySpy.thirdCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
        expect(pollOnceForKeySpy.getCalls()[3].args).to.deep.eq(
          pollOnceForGroupArgs(groupConvoPubkey.key as GroupPubkeyType)
        );
      });

      it('does run twice if activeAt is more than 2 days old and we tick more than one minute', async () => {
        pollOnceForKeySpy.resetHistory();
        TestUtils.stubWindowLog();
        convo.set('active_at', Date.now() - 2 * 25 * 3600 * 1000); // medium active
        // fake that the group is part of the wrapper otherwise we stop tracking it after the first polling event

        const timeToTick = 65 * 1000; // more than one minute
        swarmPolling.forcePolledTimestamp(convo.id, timeToTick);
        clock.tick(timeToTick); // should tick twice more (one more our direct pubkey and one for the group)

        // fake that the group is part of the wrapper otherwise we stop tracking it after the first polling event

        await swarmPolling.pollForAllKeys();

        expect(pollOnceForKeySpy.callCount).to.eq(4);

        // first two calls are our pubkey
        expect(pollOnceForKeySpy.firstCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
        expect(pollOnceForKeySpy.secondCall.args).to.deep.eq(
          pollOnceForGroupArgs(groupConvoPubkey.key as GroupPubkeyType)
        );
        expect(pollOnceForKeySpy.thirdCall.args).to.deep.eq(pollOnceForUsArgs(ourPubkey.key));
        expect(pollOnceForKeySpy.getCalls()[3].args).to.deep.eq(
          pollOnceForGroupArgs(groupConvoPubkey.key as GroupPubkeyType)
        );
      });
    });
  });
});
