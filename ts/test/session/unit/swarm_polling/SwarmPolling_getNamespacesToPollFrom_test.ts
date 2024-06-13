import { expect } from 'chai';
import Sinon from 'sinon';
import { ConversationTypeEnum } from '../../../../models/conversationAttributes';
import { getSwarmPollingInstance } from '../../../../session/apis/snode_api';
import { SnodeNamespaces } from '../../../../session/apis/snode_api/namespaces';
import { SwarmPolling } from '../../../../session/apis/snode_api/swarmPolling';
import { TestUtils } from '../../../test-utils';

describe('SwarmPolling:getNamespacesToPollFrom', () => {
  let swarmPolling: SwarmPolling;

  beforeEach(async () => {
    TestUtils.stubLibSessionWorker(undefined);
    TestUtils.stubWindowLog();
    swarmPolling = getSwarmPollingInstance();
    swarmPolling.resetSwarmPolling();
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('for us/private ', () => {
    expect(swarmPolling.getNamespacesToPollFrom(ConversationTypeEnum.PRIVATE)).to.deep.equal([
      SnodeNamespaces.Default,
      SnodeNamespaces.UserProfile,
      SnodeNamespaces.UserContacts,
      SnodeNamespaces.UserGroups,
      SnodeNamespaces.ConvoInfoVolatile,
    ]);
  });

  it('for group v2 (03 prefix) ', () => {
    expect(swarmPolling.getNamespacesToPollFrom(ConversationTypeEnum.GROUPV2)).to.deep.equal([
      SnodeNamespaces.ClosedGroupRevokedRetrievableMessages,
      SnodeNamespaces.ClosedGroupMessages,
      SnodeNamespaces.ClosedGroupInfo,
      SnodeNamespaces.ClosedGroupMembers,
      SnodeNamespaces.ClosedGroupKeys,
    ]);
  });

  it('for legacy group ', () => {
    expect(swarmPolling.getNamespacesToPollFrom(ConversationTypeEnum.GROUP)).to.deep.equal([
      SnodeNamespaces.LegacyClosedGroup,
    ]);
  });

  it('for unknown type ', () => {
    expect(() => swarmPolling.getNamespacesToPollFrom('invalidtype' as any)).to.throw(''); // empty string just means that we want it to throw anything
  });
});
