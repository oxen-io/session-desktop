import { expect } from 'chai';
import Sinon from 'sinon';
import { PingPong421 } from '../../../../session/apis/snode_api/PingPong421';
import { TestUtils } from '../../../test-utils';

describe('PingPong421', () => {
  let associatedWith: string;
  beforeEach(() => {
    TestUtils.stubWindowLog();
    associatedWith = TestUtils.generateFakePubKeyStr();

    PingPong421.resetTracked421s();
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('empty array reports false', async () => {
    expect(
      PingPong421.hasBeenReportingInvalid421({
        associatedWith,
        snodeEd25519: TestUtils.generateFakePubKeyStr(),
      })
    ).to.be.eq(false);
    expect(
      PingPong421.hasBeenReportingInvalid421({
        associatedWith,
        snodeEd25519: TestUtils.generateFakePubKeyStr(),
      })
    ).to.be.eq(false);
  });
  it('if one from swarmA says swarm is B, but one from swarmB says swarmA, we still do not know who is right', async () => {
    const swarmA = TestUtils.generateFakeSnodes(4);
    const swarmB = TestUtils.generateFakeSnodes(4);

    const snodeA = swarmA[0];
    const snodeB = swarmB[0];

    PingPong421.track421s({
      associatedWith,
      snodeEd25519: snodeA.pubkey_ed25519,
      snodes: swarmB,
    });
    PingPong421.track421s({
      associatedWith,
      snodeEd25519: snodeB.pubkey_ed25519,
      snodes: swarmA,
    });
    expect(
      PingPong421.hasBeenReportingInvalid421({
        associatedWith,
        snodeEd25519: snodeA.pubkey_ed25519,
      })
    ).to.be.eq(false);
    expect(
      PingPong421.hasBeenReportingInvalid421({
        associatedWith,
        snodeEd25519: snodeB.pubkey_ed25519,
      })
    ).to.be.eq(false);
  });

  it('if one from swarmA says swarm is B, but one from swarmB says swarmA twice, we consider that the right one is swarmA', async () => {
    const swarmA = TestUtils.generateFakeSnodes(4);
    const swarmB = TestUtils.generateFakeSnodes(4);

    const snodeA = swarmA[0];
    const snodeB = swarmB[0];

    // one report of snodeA says the right swarm is swarmB
    PingPong421.track421s({
      associatedWith,
      snodeEd25519: snodeA.pubkey_ed25519,
      snodes: swarmB,
    });

    // two reports of snodeB says the right swarm is swarmA
    PingPong421.track421s({
      associatedWith,
      snodeEd25519: snodeB.pubkey_ed25519,
      snodes: swarmA,
    });
    PingPong421.track421s({
      associatedWith,
      snodeEd25519: snodeB.pubkey_ed25519,
      snodes: swarmA,
    });

    expect(
      PingPong421.hasBeenReportingInvalid421({
        associatedWith,
        snodeEd25519: snodeA.pubkey_ed25519,
      })
    ).to.be.eq(true);
    expect(
      PingPong421.hasBeenReportingInvalid421({
        associatedWith,
        snodeEd25519: snodeB.pubkey_ed25519,
      })
    ).to.be.eq(false);
  });
});
