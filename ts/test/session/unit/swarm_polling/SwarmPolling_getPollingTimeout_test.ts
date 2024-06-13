import { expect } from 'chai';
import Sinon from 'sinon';
import { ConversationTypeEnum } from '../../../../models/conversationAttributes';
import {
  SwarmPolling,
  getSwarmPollingInstance,
} from '../../../../session/apis/snode_api/swarmPolling';
import { SWARM_POLLING_TIMEOUT } from '../../../../session/constants';
import { ConvoHub } from '../../../../session/conversations/ConversationController';
import { PubKey } from '../../../../session/types';
import { TestUtils } from '../../../test-utils';
import { stubData } from '../../../test-utils/utils';

describe('SwarmPolling:getPollingTimeout', () => {
  let swarmPolling: SwarmPolling;

  beforeEach(async () => {
    TestUtils.stubLibSessionWorker(undefined);
    TestUtils.stubWindowLog();
    swarmPolling = getSwarmPollingInstance();
    swarmPolling.resetSwarmPolling();
    ConvoHub.use().reset();
    stubData('getAllConversations').resolves([]);
    await ConvoHub.use().load();
  });

  afterEach(() => {
    Sinon.restore();
    ConvoHub.use().reset();
  });

  it('returns INACTIVE for non existing convo', () => {
    const fakeConvo = TestUtils.generateFakePubKey();

    expect(swarmPolling.getPollingTimeout(fakeConvo)).to.eq(SWARM_POLLING_TIMEOUT.INACTIVE);
  });

  describe('legacy groups', () => {
    it('returns ACTIVE for convo with less than two days old activeAt', () => {
      const convo = ConvoHub.use().getOrCreate(
        TestUtils.generateFakePubKeyStr(),
        ConversationTypeEnum.GROUP
      );
      convo.set('active_at', Date.now() - 2 * 23 * 3600 * 1000); // 23 * 2 = 46 hours old
      expect(swarmPolling.getPollingTimeout(PubKey.cast(convo.id as string))).to.eq(
        SWARM_POLLING_TIMEOUT.ACTIVE
      );
    });

    it('returns INACTIVE for convo with undefined activeAt', () => {
      const convo = ConvoHub.use().getOrCreate(
        TestUtils.generateFakePubKeyStr(),
        ConversationTypeEnum.GROUP
      );
      convo.set('active_at', undefined);
      expect(swarmPolling.getPollingTimeout(PubKey.cast(convo.id as string))).to.eq(
        SWARM_POLLING_TIMEOUT.INACTIVE
      );
    });

    it('returns MEDIUM_ACTIVE for convo with activeAt of more than 2 days but less than a week old', () => {
      const convo = ConvoHub.use().getOrCreate(
        TestUtils.generateFakePubKeyStr(),
        ConversationTypeEnum.GROUP
      );
      convo.set('active_at', Date.now() - 1000 * 3600 * 25 * 2); // 25 hours x 2 = 50 hours old
      expect(swarmPolling.getPollingTimeout(PubKey.cast(convo.id as string))).to.eq(
        SWARM_POLLING_TIMEOUT.MEDIUM_ACTIVE
      );

      convo.set('active_at', Date.now() - 1000 * 3600 * 24 * 7 + 3600); // a week minus an hour old
      expect(swarmPolling.getPollingTimeout(PubKey.cast(convo.id as string))).to.eq(
        SWARM_POLLING_TIMEOUT.MEDIUM_ACTIVE
      );
    });

    it('returns INACTIVE for convo with  activeAt of more than a week', () => {
      const convo = ConvoHub.use().getOrCreate(
        TestUtils.generateFakePubKeyStr(),
        ConversationTypeEnum.GROUP
      );
      convo.set('active_at', Date.now() - 1000 * 3600 * 24 * 8); // 8 days
      expect(swarmPolling.getPollingTimeout(PubKey.cast(convo.id as string))).to.eq(
        SWARM_POLLING_TIMEOUT.INACTIVE
      );
    });
  });

  describe('groupv2', () => {
    it('returns ACTIVE for convo with less than two days old activeAt', () => {
      const convo = ConvoHub.use().getOrCreate(
        TestUtils.generateFakeClosedGroupV2PkStr(),
        ConversationTypeEnum.GROUPV2
      );
      convo.set('active_at', Date.now() - 2 * 23 * 3600 * 1000); // 23 * 2 = 46 hours old
      expect(swarmPolling.getPollingTimeout(PubKey.cast(convo.id as string))).to.eq(
        SWARM_POLLING_TIMEOUT.ACTIVE
      );
    });

    it('returns INACTIVE for convo with undefined activeAt', () => {
      const convo = ConvoHub.use().getOrCreate(
        TestUtils.generateFakeClosedGroupV2PkStr(),
        ConversationTypeEnum.GROUPV2
      );
      convo.set('active_at', undefined);
      expect(swarmPolling.getPollingTimeout(PubKey.cast(convo.id as string))).to.eq(
        SWARM_POLLING_TIMEOUT.INACTIVE
      );
    });

    it('returns MEDIUM_ACTIVE for convo with activeAt of more than 2 days but less than a week old', () => {
      const convo = ConvoHub.use().getOrCreate(
        TestUtils.generateFakeClosedGroupV2PkStr(),
        ConversationTypeEnum.GROUPV2
      );
      convo.set('active_at', Date.now() - 1000 * 3600 * 25 * 2); // 25 hours x 2 = 50 hours old
      expect(swarmPolling.getPollingTimeout(PubKey.cast(convo.id as string))).to.eq(
        SWARM_POLLING_TIMEOUT.MEDIUM_ACTIVE
      );

      convo.set('active_at', Date.now() - 1000 * 3600 * 24 * 7 + 3600); // a week minus an hour old
      expect(swarmPolling.getPollingTimeout(PubKey.cast(convo.id as string))).to.eq(
        SWARM_POLLING_TIMEOUT.MEDIUM_ACTIVE
      );
    });

    it('returns INACTIVE for convo with  activeAt of more than a week', () => {
      const convo = ConvoHub.use().getOrCreate(
        TestUtils.generateFakeClosedGroupV2PkStr(),
        ConversationTypeEnum.GROUPV2
      );
      convo.set('active_at', Date.now() - 1000 * 3600 * 24 * 8); // 8 days
      expect(swarmPolling.getPollingTimeout(PubKey.cast(convo.id as string))).to.eq(
        SWARM_POLLING_TIMEOUT.INACTIVE
      );
    });
  });
});
