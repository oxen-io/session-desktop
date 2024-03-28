import Sinon from 'sinon';
import { PingPong421 } from '../../../../session/apis/snode_api/PingPong421';
import { TestUtils } from '../../../test-utils';

describe('PingPong421', () => {
  beforeEach(() => {
    TestUtils.stubWindowLog();

    PingPong421.resetTracked421s();
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('if the cached snode pool has at least 12 snodes, just return it without fetching from seed', async () => {});
});
