import _ from 'lodash';
import pRetry from 'p-retry';

import { SeedNodeAPI } from '.';
import { Snode } from '../../../data/data';
import { APPLICATION_JSON } from '../../../types/MIME';
import { allowOnlyOneAtATime } from '../../utils/Promise';
import { GetServicesNodesFromSeedRequest } from '../snode_api/SnodeRequestTypes';

/**
 * Fetch all snodes from seed nodes.
 * Exported only for tests. This is not to be used by the app directly
 * @param seedNodes the seednodes to use to fetch snodes details
 */
export async function fetchSnodePoolFromSeedNodeWithRetries(
  seedNodes: Array<string>
): Promise<Array<Snode>> {
  try {
    window?.log?.info(`fetchSnodePoolFromSeedNode with seedNodes.length ${seedNodes.length}`);

    let snodes = await getSnodeListFromSeednodeOneAtAtime(seedNodes);
    // make sure order of the list is random, so we get version in a non-deterministic way
    snodes = _.shuffle(snodes);
    // commit changes to be live
    // we'll update the version (in case they upgrade) every cycle
    const fetchSnodePool = snodes.map(snode => ({
      ip: snode.public_ip,
      port: snode.storage_port,
      pubkey_x25519: snode.pubkey_x25519,
      pubkey_ed25519: snode.pubkey_ed25519,
    }));
    window?.log?.info(
      'SeedNodeAPI::fetchSnodePoolFromSeedNodeWithRetries - Refreshed random snode pool with',
      snodes.length,
      'snodes'
    );

    return fetchSnodePool;
  } catch (e) {
    window?.log?.warn(
      'SessionSnodeAPI::fetchSnodePoolFromSeedNodeWithRetries - error',
      e.code,
      e.message
    );

    throw new Error('Failed to contact seed node');
  }
}

export interface SnodeFromSeed {
  public_ip: string;
  storage_port: number;
  pubkey_x25519: string;
  pubkey_ed25519: string;
}

const getSnodeListFromSeednodeOneAtAtime = async (seedNodes: Array<string>) =>
  allowOnlyOneAtATime('getSnodeListFromSeednode', () => getSnodeListFromSeednode(seedNodes));

/**
 * This call will try 4 times to contact a seed nodes (random) and get the snode list from it.
 * If all attempts fails, this function will throw the last error.
 * The returned list is not shuffled when returned.
 */
async function getSnodeListFromSeednode(seedNodes: Array<string>): Promise<Array<SnodeFromSeed>> {
  const SEED_NODE_RETRIES = 4;

  return pRetry(
    async () => {
      window?.log?.info('getSnodeListFromSeednode starting...');
      if (!seedNodes.length) {
        window?.log?.info('loki_snode_api::getSnodeListFromSeednode - seedNodes are empty');
        throw new Error('getSnodeListFromSeednode - seedNodes are empty');
      }
      // do not try/catch, we do want exception to bubble up so pRetry, well, retries
      const snodes = await SeedNodeAPI.TEST_fetchSnodePoolFromSeedNodeRetryable(seedNodes);

      return snodes;
    },
    {
      retries: SEED_NODE_RETRIES - 1,
      factor: 2,
      minTimeout: SeedNodeAPI.getMinTimeout(),
      onFailedAttempt: e => {
        window?.log?.warn(
          `fetchSnodePoolFromSeedNodeRetryable attempt #${e.attemptNumber} failed. ${e.retriesLeft} retries left... Error: ${e.message}`
        );
      },
    }
  );
}

export function getMinTimeout() {
  return 1000;
}

/**
 * This functions choose randonly a seed node from seedNodes and try to get the snodes from it, or throws.
 * This function is to be used with a pRetry caller
 */
export async function TEST_fetchSnodePoolFromSeedNodeRetryable(
  seedNodes: Array<string>
): Promise<Array<SnodeFromSeed>> {
  window?.log?.info('fetchSnodePoolFromSeedNodeRetryable starting...');

  if (!seedNodes.length) {
    window?.log?.info('loki_snode_api::fetchSnodePoolFromSeedNodeRetryable - seedNodes are empty');
    throw new Error('fetchSnodePoolFromSeedNodeRetryable: Seed nodes are empty');
  }

  const seedNodeUrl = _.sample(seedNodes);
  if (!seedNodeUrl) {
    window?.log?.warn(
      'loki_snode_api::fetchSnodePoolFromSeedNodeRetryable - Could not select random snodes from',
      seedNodes
    );
    throw new Error('fetchSnodePoolFromSeedNodeRetryable: Seed nodes are empty #2');
  }

  const tryUrl = new URL(seedNodeUrl);

  const snodes = await getSnodesFromSeedUrl(tryUrl);
  if (snodes.length === 0) {
    window?.log?.warn(
      `loki_snode_api::fetchSnodePoolFromSeedNodeRetryable - ${seedNodeUrl} did not return any snodes`
    );
    throw new Error(`Failed to contact seed node: ${seedNodeUrl}`);
  }

  return snodes;
}

/**
 * Try to get the snode list from the given seed node URL, or throws.
 * This function throws for whatever reason might happen (timeout, invalid response, 0 valid snodes returned, ...)
 * This function is to be used inside a pRetry function
 */
async function getSnodesFromSeedUrl(urlObj: URL): Promise<Array<any>> {
  // Removed limit until there is a way to get snode info
  // for individual nodes (needed for guard nodes);  this way
  // we get all active nodes
  window?.log?.info(`getSnodesFromSeedUrl starting with ${urlObj.href}`);

  const endpoint = 'json_rpc';
  const url = `${urlObj.href}${endpoint}`;
  const body: GetServicesNodesFromSeedRequest = {
    jsonrpc: '2.0',
    method: 'get_n_service_nodes',
    params: {
      active_only: true,
      fields: {
        public_ip: true,
        storage_port: true,
        pubkey_x25519: true,
        pubkey_ed25519: true,
      },
    },
  };

  const fetchOptions = {
    method: 'POST',
    timeout: 5000,
    body: JSON.stringify(body),
    headers: {
      'User-Agent': 'WhatsApp',
      'Accept-Language': 'en-us',
    },
  };
  window?.log?.info(`insecureNodeFetch => plaintext for getSnodesFromSeedUrl  ${url}`);

  const response = await window.fetch(url, {
    method: fetchOptions.method,
    body: fetchOptions.body,
    headers: fetchOptions.headers,
  });

  if (response.status !== 200) {
    window?.log?.error(
      `loki_snode_api:::getSnodesFromSeedUrl - invalid response from seed ${urlObj.toString()}:`,
      response
    );
    throw new Error(
      `getSnodesFromSeedUrl: status is not 200 ${response.status} from ${urlObj.href}`
    );
  }

  if (response.headers.get('Content-Type') !== APPLICATION_JSON) {
    window?.log?.error('Response is not json');
    throw new Error(`getSnodesFromSeedUrl: response is not json Content-Type from ${urlObj.href}`);
  }

  try {
    const json = await response.json();
    const result = json.result;

    if (!result) {
      window?.log?.error(
        `loki_snode_api:::getSnodesFromSeedUrl - invalid result from seed ${urlObj.toString()}:`,
        response
      );
      throw new Error(`getSnodesFromSeedUrl: json.result is empty from ${urlObj.href}`);
    }
    // Filter 0.0.0.0 nodes which haven't submitted uptime proofs
    const validNodes = result.service_node_states.filter(
      (snode: any) => snode.public_ip !== '0.0.0.0'
    );

    if (validNodes.length === 0) {
      throw new Error(`Did not get a single valid snode from ${urlObj.href}`);
    }
    return validNodes;
  } catch (e) {
    window?.log?.error('Invalid json response. error:', e.message);
    throw new Error(`getSnodesFromSeedUrl: cannot parse content as JSON from ${urlObj.href}`);
  }
}
