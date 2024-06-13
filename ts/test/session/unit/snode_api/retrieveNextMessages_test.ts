import chai from 'chai';
import { beforeEach, describe } from 'mocha';
import Sinon from 'sinon';

import { GroupPubkeyType, PubkeyType } from 'libsession_util_nodejs';
import {
  RetrieveGroupSubRequest,
  RetrieveLegacyClosedGroupSubRequest,
  RetrieveUserSubRequest,
  UpdateExpiryOnNodeGroupSubRequest,
  UpdateExpiryOnNodeUserSubRequest,
} from '../../../../session/apis/snode_api/SnodeRequestTypes';
import { GetNetworkTime } from '../../../../session/apis/snode_api/getNetworkTime';
import { SnodeNamespaces } from '../../../../session/apis/snode_api/namespaces';
import { SnodeAPIRetrieve } from '../../../../session/apis/snode_api/retrieveRequest';
import { WithShortenOrExtend } from '../../../../session/apis/snode_api/types';
import { TestUtils } from '../../../test-utils';
import { expectAsyncToThrow, stubLibSessionWorker } from '../../../test-utils/utils';

const { expect } = chai;

function expectRetrieveWith({
  request,
  namespace,
  lastHash,
  maxSize,
}: {
  request: RetrieveLegacyClosedGroupSubRequest | RetrieveUserSubRequest | RetrieveGroupSubRequest;
  namespace: SnodeNamespaces;
  lastHash: string | null;
  maxSize: number;
}) {
  expect(request.namespace).to.be.eq(namespace);
  expect(request.last_hash).to.be.eq(lastHash);
  expect(request.max_size).to.be.eq(maxSize);
}

function expectExpireWith({
  request,
  hashes,
  shortenOrExtend,
}: {
  request: UpdateExpiryOnNodeUserSubRequest | UpdateExpiryOnNodeGroupSubRequest;
  hashes: Array<string>;
} & WithShortenOrExtend) {
  expect(request.messageHashes).to.be.deep.eq(hashes);
  expect(request.shortenOrExtend).to.be.eq(shortenOrExtend);
  expect(request.expiryMs).to.be.above(GetNetworkTime.now() + 14 * 24 * 3600 * 1000 - 100);
  expect(request.expiryMs).to.be.above(GetNetworkTime.now() + 14 * 24 * 3600 * 1000 + 100);
}

describe('SnodeAPI:buildRetrieveRequest', () => {
  let us: PubkeyType;
  beforeEach(async () => {
    TestUtils.stubWindowLog();
    us = TestUtils.generateFakePubKeyStr();
  });

  afterEach(() => {
    Sinon.restore();
  });

  describe('us', () => {
    it('with single namespace and lasthash, no hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest(
        [{ lastHash: 'lasthash', namespace: SnodeNamespaces.Default }],
        us,
        us,
        null
      );

      expect(requests.length).to.be.eq(1);
      const req = requests[0];
      if (req.method !== 'retrieve') {
        throw new Error('expected retrieve method');
      }
      expectRetrieveWith({
        request: req,
        lastHash: 'lasthash',
        maxSize: -1,
        namespace: SnodeNamespaces.Default,
      });
    });

    it('with two namespace and lasthashes, no hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest(
        [
          { lastHash: 'lasthash1', namespace: SnodeNamespaces.Default },
          { lastHash: 'lasthash2', namespace: SnodeNamespaces.UserContacts },
        ],
        us,
        us,
        null
      );

      expect(requests.length).to.be.eq(2);
      const req1 = requests[0];
      const req2 = requests[1];
      if (req1.method !== 'retrieve' || req2.method !== 'retrieve') {
        throw new Error('expected retrieve method');
      }

      expectRetrieveWith({
        request: req1,
        lastHash: 'lasthash1',
        maxSize: -2,
        namespace: SnodeNamespaces.Default,
      });

      expectRetrieveWith({
        request: req2,
        lastHash: 'lasthash2',
        maxSize: -2,
        namespace: SnodeNamespaces.UserContacts,
      });
    });

    it('with two namespace and lasthashes, 2 hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest(
        [
          { lastHash: 'lasthash1', namespace: SnodeNamespaces.Default },
          { lastHash: 'lasthash2', namespace: SnodeNamespaces.UserContacts },
        ],
        us,
        us,
        ['hashbump1', 'hashbump2']
      );

      expect(requests.length).to.be.eq(3);
      const req1 = requests[0];
      const req2 = requests[1];
      const req3 = requests[2];
      if (req1.method !== 'retrieve' || req2.method !== 'retrieve') {
        throw new Error('expected retrieve method');
      }
      if (req3.method !== 'expire') {
        throw new Error('expected expire method');
      }

      expectRetrieveWith({
        request: req1,
        lastHash: 'lasthash1',
        maxSize: -2,
        namespace: SnodeNamespaces.Default,
      });

      expectRetrieveWith({
        request: req2,
        lastHash: 'lasthash2',
        maxSize: -2,
        namespace: SnodeNamespaces.UserContacts,
      });

      expectExpireWith({
        request: req3,
        hashes: ['hashbump1', 'hashbump2'],
        shortenOrExtend: '',
      });
    });

    it('with 0 namespaces, 2 hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest([], us, us, [
        'hashbump1',
        'hashbump2',
      ]);

      expect(requests.length).to.be.eq(1);
      const req1 = requests[0];
      if (req1.method !== 'expire') {
        throw new Error('expected expire method');
      }

      expectExpireWith({
        request: req1,
        hashes: ['hashbump1', 'hashbump2'],
        shortenOrExtend: '',
      });
    });

    it('with 0 namespaces, 0 hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest([], us, us, []);
      expect(requests.length).to.be.eq(0);
    });
    it('with 0 namespaces, null hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest([], us, us, null);
      expect(requests.length).to.be.eq(0);
    });

    it('throws if given an invalid user namespace to retrieve from ', async () => {
      const pr = async () =>
        SnodeAPIRetrieve.buildRetrieveRequest(
          [
            { lastHash: 'lasthash1', namespace: SnodeNamespaces.ClosedGroupKeys },
            { lastHash: 'lasthash2', namespace: SnodeNamespaces.UserContacts },
          ],
          us,
          us,
          ['hashbump1', 'hashbump2']
        );

      await expectAsyncToThrow(
        pr,
        `retrieveRequestForUs not a valid namespace to retrieve as us:${SnodeNamespaces.ClosedGroupKeys}`
      );
    });
  });

  describe('legacy group', () => {
    let groupPk: PubkeyType;
    beforeEach(() => {
      groupPk = TestUtils.generateFakePubKeyStr();
    });
    it('with single namespace and lasthash, no hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest(
        [{ lastHash: 'lasthash', namespace: SnodeNamespaces.LegacyClosedGroup }],
        groupPk,
        us,
        null
      );

      expect(requests.length).to.be.eq(1);
      const req = requests[0];
      if (req.method !== 'retrieve') {
        throw new Error('expected retrieve method');
      }
      expectRetrieveWith({
        request: req,
        lastHash: 'lasthash',
        maxSize: -1,
        namespace: SnodeNamespaces.LegacyClosedGroup,
      });
    });

    it('with 1 namespace and lasthashes, 2 hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest(
        [{ lastHash: 'lasthash1', namespace: SnodeNamespaces.LegacyClosedGroup }],
        groupPk,
        us,
        ['hashbump1', 'hashbump2'] // legacy groups have not the possibility to bump the expire of messages
      );

      expect(requests.length).to.be.eq(1);
      const req1 = requests[0];
      if (req1.method !== 'retrieve') {
        throw new Error('expected retrieve/expire method');
      }

      expectRetrieveWith({
        request: req1,
        lastHash: 'lasthash1',
        maxSize: -1,
        namespace: SnodeNamespaces.LegacyClosedGroup,
      });
    });

    it('with 0 namespaces, 2 hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest([], groupPk, us, [
        'hashbump1',
        'hashbump2',
      ]);

      expect(requests.length).to.be.eq(0); // legacy groups have not possibility to bump expire of messages
    });

    it('with 0 namespaces, 0 hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest([], groupPk, us, []);
      expect(requests.length).to.be.eq(0);
    });
    it('with 0 namespaces, null hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest([], groupPk, us, null);
      expect(requests.length).to.be.eq(0);
    });

    it('throws if given an invalid legacy group namespace to retrieve from ', async () => {
      const pr = async () =>
        SnodeAPIRetrieve.buildRetrieveRequest(
          [
            { lastHash: 'lasthash1', namespace: SnodeNamespaces.ClosedGroupKeys },
            { lastHash: 'lasthash2', namespace: SnodeNamespaces.UserContacts },
          ],
          groupPk,
          us,
          ['hashbump1', 'hashbump2']
        );

      await expectAsyncToThrow(
        pr,
        `retrieveRequestForUs not a valid namespace to retrieve as us:${SnodeNamespaces.ClosedGroupKeys}`
      );
    });
  });

  describe('group v2', () => {
    let groupPk: GroupPubkeyType;
    beforeEach(() => {
      groupPk = TestUtils.generateFakeClosedGroupV2PkStr();
      stubLibSessionWorker({});
    });
    it('with single namespace and lasthash, no hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest(
        [{ lastHash: 'lasthash', namespace: SnodeNamespaces.ClosedGroupInfo }],
        groupPk,
        us,
        null
      );

      expect(requests.length).to.be.eq(1);
      const req = requests[0];
      if (req.method !== 'retrieve') {
        throw new Error('expected retrieve method');
      }
      expectRetrieveWith({
        request: req,
        lastHash: 'lasthash',
        maxSize: -1,
        namespace: SnodeNamespaces.ClosedGroupInfo,
      });
    });

    it('with two namespace and lasthashes, no hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest(
        [
          { lastHash: 'lasthash1', namespace: SnodeNamespaces.ClosedGroupInfo },
          { lastHash: 'lasthash2', namespace: SnodeNamespaces.ClosedGroupMessages },
        ],
        groupPk,
        us,
        null
      );

      expect(requests.length).to.be.eq(2);
      const req1 = requests[0];
      const req2 = requests[1];
      if (req1.method !== 'retrieve' || req2.method !== 'retrieve') {
        throw new Error('expected retrieve method');
      }

      expectRetrieveWith({
        request: req1,
        lastHash: 'lasthash1',
        maxSize: -2,
        namespace: SnodeNamespaces.ClosedGroupInfo,
      });

      expectRetrieveWith({
        request: req2,
        lastHash: 'lasthash2',
        maxSize: -2,
        namespace: SnodeNamespaces.ClosedGroupMessages,
      });
    });

    it('with two namespace and lasthashes, 2 hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest(
        [
          { lastHash: 'lasthash1', namespace: SnodeNamespaces.ClosedGroupInfo },
          { lastHash: 'lasthash2', namespace: SnodeNamespaces.ClosedGroupKeys },
        ],
        groupPk,
        us,
        ['hashbump1', 'hashbump2']
      );

      expect(requests.length).to.be.eq(3);
      const req1 = requests[0];
      const req2 = requests[1];
      const req3 = requests[2];
      if (req1.method !== 'retrieve' || req2.method !== 'retrieve') {
        throw new Error('expected retrieve method');
      }
      if (req3.method !== 'expire') {
        throw new Error('expected expire method');
      }

      expectRetrieveWith({
        request: req1,
        lastHash: 'lasthash1',
        maxSize: -2,
        namespace: SnodeNamespaces.ClosedGroupInfo,
      });

      expectRetrieveWith({
        request: req2,
        lastHash: 'lasthash2',
        maxSize: -2,
        namespace: SnodeNamespaces.ClosedGroupKeys,
      });

      expectExpireWith({
        request: req3,
        hashes: ['hashbump1', 'hashbump2'],
        shortenOrExtend: '',
      });
    });

    it('with 0 namespaces, 2 hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest([], groupPk, us, [
        'hashbump1',
        'hashbump2',
      ]);

      expect(requests.length).to.be.eq(1);
      const req1 = requests[0];
      if (req1.method !== 'expire') {
        throw new Error('expected expire method');
      }

      expectExpireWith({
        request: req1,
        hashes: ['hashbump1', 'hashbump2'],
        shortenOrExtend: '',
      });
    });

    it('with 0 namespaces, 0 hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest([], groupPk, us, []);
      expect(requests.length).to.be.eq(0);
    });
    it('with 0 namespaces, null hashesToBump ', async () => {
      const requests = await SnodeAPIRetrieve.buildRetrieveRequest([], groupPk, us, null);
      expect(requests.length).to.be.eq(0);
    });

    it('throws if given an invalid group namespace to retrieve from ', async () => {
      const pr = async () =>
        SnodeAPIRetrieve.buildRetrieveRequest(
          [
            { lastHash: 'lasthash1', namespace: SnodeNamespaces.ClosedGroupKeys },
            { lastHash: 'lasthash2', namespace: SnodeNamespaces.UserContacts },
          ],
          groupPk,
          us,
          ['hashbump1', 'hashbump2']
        );

      await expectAsyncToThrow(
        pr,
        `tried to poll from a non 03 group namespace ${SnodeNamespaces.UserContacts}`
      );
    });
  });
});
