/* eslint-disable no-await-in-loop */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { GroupPubkeyType, PubkeyType } from 'libsession_util_nodejs';
import { compact, difference, isString, omit } from 'lodash';
import Long from 'long';
import { UserUtils } from '..';
import { ConfigDumpData } from '../../../data/configDump/configDump';
import { assertUnreachable } from '../../../types/sqlSharedTypes';
import {
  ConfigWrapperGroupDetailed,
  ConfigWrapperUser,
  isUserConfigWrapperType,
} from '../../../webworker/workers/browser/libsession_worker_functions';
import {
  GenericWrapperActions,
  MetaGroupWrapperActions,
} from '../../../webworker/workers/browser/libsession_worker_interface';
import {
  BatchResultEntry,
  NotEmptyArrayOfBatchResults,
} from '../../apis/snode_api/SnodeRequestTypes';
import { SnodeNamespaces, SnodeNamespacesUserConfig } from '../../apis/snode_api/namespaces';
import { PubKey } from '../../types';
import { UserSync } from '../job_runners/jobs/UserSyncJob';
import { ed25519Str } from '../String';

const requiredUserVariants: Array<ConfigWrapperUser> = [
  'UserConfig',
  'ContactsConfig',
  'UserGroupsConfig',
  'ConvoInfoVolatileConfig',
];

async function initializeLibSessionUtilWrappers() {
  const keypair = await UserUtils.getUserED25519KeyPairBytes();
  if (!keypair || !keypair.privKeyBytes) {
    throw new Error('edkeypair not found for current user');
  }
  const privateKeyEd25519 = keypair.privKeyBytes;
  // let's plan a sync on start with some room for the app to be ready
  setTimeout(() => UserSync.queueNewJobIfNeeded, 20000);

  // fetch the dumps we already have from the database
  const dumps = await ConfigDumpData.getAllDumpsWithData();
  window.log.info(
    'initializeLibSessionUtilWrappers alldumpsInDB already: ',
    JSON.stringify(dumps.map(m => omit(m, 'data')))
  );

  const userVariantsBuildWithoutErrors = new Set<ConfigWrapperUser>();

  // load the dumps retrieved from the database into their corresponding wrappers
  for (let index = 0; index < dumps.length; index++) {
    const dump = dumps[index];
    const variant = dump.variant;
    if (!isUserConfigWrapperType(variant)) {
      continue;
    }
    window.log.debug('initializeLibSessionUtilWrappers initing from dump', variant);
    try {
      await GenericWrapperActions.init(
        variant,
        privateKeyEd25519,
        dump.data.length ? dump.data : null
      );

      userVariantsBuildWithoutErrors.add(variant);
    } catch (e) {
      window.log.warn(`init of UserConfig failed with ${e.message} `);
      throw new Error(`initializeLibSessionUtilWrappers failed with ${e.message}`);
    }
  }

  const missingRequiredVariants: Array<ConfigWrapperUser> = difference(
    LibSessionUtil.requiredUserVariants,
    [...userVariantsBuildWithoutErrors.values()]
  );

  for (let index = 0; index < missingRequiredVariants.length; index++) {
    const missingVariant = missingRequiredVariants[index];
    window.log.warn(
      `initializeLibSessionUtilWrappers: missingRequiredVariants "${missingVariant}"`
    );
    await GenericWrapperActions.init(missingVariant, privateKeyEd25519, null);
    // save the newly created dump to the database even if it is empty, just so we do not need to recreate one next run

    const dump = await GenericWrapperActions.dump(missingVariant);
    await ConfigDumpData.saveConfigDump({
      data: dump,
      publicKey: UserUtils.getOurPubKeyStrFromCache(),
      variant: missingVariant,
    });
    window.log.debug(
      `initializeLibSessionUtilWrappers: missingRequiredVariants "${missingVariant}" created`
    );
  }

  // No need to load the meta group wrapper here. We will load them once the SessionInbox is loaded with a redux action
}

type PendingChangesShared = {
  ciphertext: Uint8Array;
};

export type PendingChangesForUs = PendingChangesShared & {
  seqno: Long;
  namespace: SnodeNamespacesUserConfig;
};

type PendingChangesForGroupNonKey = PendingChangesShared & {
  seqno: Long;
  namespace: SnodeNamespaces.ClosedGroupInfo | SnodeNamespaces.ClosedGroupMembers;
  type: Extract<ConfigWrapperGroupDetailed, 'GroupInfo' | 'GroupMember'>;
};

type PendingChangesForGroupKey = {
  ciphertext: Uint8Array;
  namespace: SnodeNamespaces.ClosedGroupKeys;
  type: Extract<ConfigWrapperGroupDetailed, 'GroupKeys'>;
};

export type PendingChangesForGroup = PendingChangesForGroupNonKey | PendingChangesForGroupKey;

type DestinationChanges<T extends PendingChangesForGroup | PendingChangesForUs> = {
  messages: Array<T>;
  allOldHashes: Set<string>;
};

export type UserDestinationChanges = DestinationChanges<PendingChangesForUs>;
export type GroupDestinationChanges = DestinationChanges<PendingChangesForGroup>;

export type UserSuccessfulChange = {
  pushed: PendingChangesForUs;
  updatedHash: string;
};

export type GroupSuccessfulChange = {
  pushed: PendingChangesForGroup;
  updatedHash: string;
};

/**
 * Fetch what needs to be pushed for all of the current user's wrappers.
 */
async function pendingChangesForUs(): Promise<UserDestinationChanges> {
  const results: UserDestinationChanges = { messages: [], allOldHashes: new Set() };
  const variantsNeedingPush = new Set<ConfigWrapperUser>();
  const userVariants = LibSessionUtil.requiredUserVariants;

  for (let index = 0; index < userVariants.length; index++) {
    const variant = userVariants[index];

    const needsPush = await GenericWrapperActions.needsPush(variant);
    if (!needsPush) {
      continue;
    }

    const { data, seqno, hashes, namespace } = await GenericWrapperActions.push(variant);
    variantsNeedingPush.add(variant);

    results.messages.push({
      ciphertext: data,
      seqno: Long.fromNumber(seqno),
      namespace, // we only use the namespace to know to wha
    });

    hashes.forEach(h => results.allOldHashes.add(h)); // add all the hashes to the set
  }
  window.log.info(`those user variants needs push: "${[...variantsNeedingPush]}"`);

  return results;
}

/**
 * Fetch what needs to be pushed for the specified group public key.
 * @param groupPk the public key of the group to fetch the details off
 * @returns an object with a list of messages to be pushed and the list of hashes to bump expiry, server side
 */
async function pendingChangesForGroup(groupPk: GroupPubkeyType): Promise<GroupDestinationChanges> {
  if (!PubKey.is03Pubkey(groupPk)) {
    throw new Error(`pendingChangesForGroup only works for user or 03 group pubkeys`);
  }
  // one of the wrapper behind the metagroup needs a push
  const needsPush = await MetaGroupWrapperActions.needsPush(groupPk);

  // we probably need to add the GROUP_KEYS check here

  if (!needsPush) {
    return { messages: [], allOldHashes: new Set() };
  }
  const { groupInfo, groupMember, groupKeys } = await MetaGroupWrapperActions.push(groupPk);
  const results = new Array<PendingChangesForGroup>();

  // Note: We need the keys to be pushed first to avoid a race condition
  if (groupKeys) {
    results.push({
      type: 'GroupKeys',
      ciphertext: groupKeys.data,
      namespace: groupKeys.namespace,
    });
  }

  if (groupInfo) {
    results.push({
      type: 'GroupInfo',
      ciphertext: groupInfo.data,
      seqno: Long.fromNumber(groupInfo.seqno),
      namespace: groupInfo.namespace,
    });
  }
  if (groupMember) {
    results.push({
      type: 'GroupMember',
      ciphertext: groupMember.data,
      seqno: Long.fromNumber(groupMember.seqno),
      namespace: groupMember.namespace,
    });
  }
  window.log.debug(
    `${ed25519Str(groupPk)} those group variants needs push: "${results.map(m => m.type)}"`
  );

  const memberHashes = compact(groupMember?.hashes) || [];
  const infoHashes = compact(groupInfo?.hashes) || [];
  const allOldHashes = new Set([...infoHashes, ...memberHashes]);

  return { messages: results, allOldHashes };
}

/**
 * Return the wrapperId associated with a specific namespace.
 * WrapperIds are what we use in the database and with the libsession workers calls, and namespace is what we push to.
 */
function userNamespaceToVariant(namespace: SnodeNamespacesUserConfig) {
  // TODO Might be worth migrating them to use directly the namespaces?
  switch (namespace) {
    case SnodeNamespaces.UserProfile:
      return 'UserConfig';
    case SnodeNamespaces.UserContacts:
      return 'ContactsConfig';
    case SnodeNamespaces.UserGroups:
      return 'UserGroupsConfig';
    case SnodeNamespaces.ConvoInfoVolatile:
      return 'ConvoInfoVolatileConfig';
    default:
      assertUnreachable(namespace, `userNamespaceToVariant: Unsupported namespace: "${namespace}"`);
      throw new Error('userNamespaceToVariant: Unsupported namespace:'); // ts is not happy without this
  }
}

function resultShouldBeIncluded<T extends PendingChangesForGroup | PendingChangesForUs>(
  msgPushed: T,
  batchResult: BatchResultEntry
) {
  const hash = batchResult.body?.hash;
  if (batchResult.code === 200 && isString(hash) && msgPushed && msgPushed.ciphertext) {
    return {
      hash,
      pushed: msgPushed,
    };
  }
  return null;
}

/**
 * This function is run once we get the results from the multiple batch-send for the group push.
 * Note: the logic is the same as `batchResultsToUserSuccessfulChange` but I couldn't make typescript happy.
 */
function batchResultsToGroupSuccessfulChange(
  result: NotEmptyArrayOfBatchResults | null,
  request: GroupDestinationChanges
): Array<GroupSuccessfulChange> {
  const successfulChanges: Array<GroupSuccessfulChange> = [];

  /**
   * For each batch request, we get as result
   * - status code + hash of the new config message
   * - status code of the delete of all messages as given by the request hashes.
   *
   * As it is a sequence, the delete might have failed but the new config message might still be posted.
   * So we need to check which request failed, and if it is the delete by hashes, we need to add the hash of the posted message to the list of hashes
   */

  if (!result?.length) {
    return successfulChanges;
  }

  for (let j = 0; j < result.length; j++) {
    const msgPushed = request.messages?.[j];

    const shouldBe = resultShouldBeIncluded(msgPushed, result[j]);

    if (shouldBe) {
      // libsession keeps track of the hashes to push and the one pushed
      successfulChanges.push({
        updatedHash: shouldBe.hash,
        pushed: shouldBe.pushed,
      });
    }
  }

  return successfulChanges;
}

/**
 * This function is run once we get the results from the multiple batch-send for the user push.
 * Note: the logic is the same as `batchResultsToGroupSuccessfulChange` but I couldn't make typescript happy.
 */
function batchResultsToUserSuccessfulChange(
  result: NotEmptyArrayOfBatchResults | null,
  request: UserDestinationChanges
): Array<UserSuccessfulChange> {
  const successfulChanges: Array<UserSuccessfulChange> = [];

  /**
   * For each batch request, we get as result
   * - status code + hash of the new config message
   * - status code of the delete of all messages as given by the request hashes.
   *
   * As it is a sequence, the delete might have failed but the new config message might still be posted.
   * So we need to check which request failed, and if it is the delete by hashes, we need to add the hash of the posted message to the list of hashes
   */

  if (!result?.length) {
    return successfulChanges;
  }

  for (let j = 0; j < result.length; j++) {
    const msgPushed = request.messages?.[j];
    const shouldBe = resultShouldBeIncluded(msgPushed, result[j]);

    if (shouldBe) {
      // libsession keeps track of the hashes to push and the one pushed
      successfulChanges.push({
        updatedHash: shouldBe.hash,
        pushed: shouldBe.pushed,
      });
    }
  }

  return successfulChanges;
}

/**
 * Check if the wrappers related to that pubkeys need to be dumped to the DB, and if yes, do it.
 */
async function saveDumpsToDb(pubkey: PubkeyType | GroupPubkeyType) {
  // first check if this is relating a group
  if (PubKey.is03Pubkey(pubkey)) {
    const metaNeedsDump = await MetaGroupWrapperActions.needsDump(pubkey);
    // save the concatenated dumps as a single entry in the DB if any of the dumps had a need for dump
    if (metaNeedsDump) {
      const dump = await MetaGroupWrapperActions.metaDump(pubkey);
      await ConfigDumpData.saveConfigDump({
        data: dump,
        publicKey: pubkey,
        variant: `MetaGroupConfig-${pubkey}`,
      });

      window.log.debug(`Saved dumps for metagroup ${ed25519Str(pubkey)}`);
    } else {
      window.log.debug(`No need to update local dumps for metagroup ${ed25519Str(pubkey)}`);
    }
    return;
  }
  // here, we can only be called with our current user pubkey
  if (pubkey !== UserUtils.getOurPubKeyStrFromCache()) {
    throw new Error('saveDumpsToDb only supports groupv2 and us pubkeys');
  }

  for (let i = 0; i < LibSessionUtil.requiredUserVariants.length; i++) {
    const variant = LibSessionUtil.requiredUserVariants[i];
    const needsDump = await GenericWrapperActions.needsDump(variant);

    if (!needsDump) {
      continue;
    }
    const dump = await GenericWrapperActions.dump(variant);
    await ConfigDumpData.saveConfigDump({
      data: dump,
      publicKey: pubkey,
      variant,
    });
  }
}

export const LibSessionUtil = {
  initializeLibSessionUtilWrappers,
  userNamespaceToVariant,
  requiredUserVariants,
  pendingChangesForUs,
  pendingChangesForGroup,
  saveDumpsToDb,
  batchResultsToGroupSuccessfulChange,
  batchResultsToUserSuccessfulChange,
};
