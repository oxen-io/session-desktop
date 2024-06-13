/* eslint-disable no-await-in-loop */
import { PubkeyType } from 'libsession_util_nodejs';
import { isArray, isEmpty, isNumber, isString } from 'lodash';
import { v4 } from 'uuid';
import { to_hex } from 'libsodium-wrappers-sumo';
import { UserUtils } from '../..';
import { ConfigDumpData } from '../../../../data/configDump/configDump';
import { UserSyncJobDone } from '../../../../shims/events';
import { isSignInByLinking } from '../../../../util/storage';
import { GenericWrapperActions } from '../../../../webworker/workers/browser/libsession_worker_interface';
import {
  DeleteHashesFromUserNodeSubRequest,
  StoreUserConfigSubRequest,
} from '../../../apis/snode_api/SnodeRequestTypes';
import { TTL_DEFAULT } from '../../../constants';
import { ConvoHub } from '../../../conversations';
import { MessageSender } from '../../../sending/MessageSender';
import { allowOnlyOneAtATime } from '../../Promise';
import { LibSessionUtil, UserSuccessfulChange } from '../../libsession/libsession_utils';
import { runners } from '../JobRunner';
import {
  AddJobCheckReturn,
  PersistedJob,
  RunJobResult,
  UserSyncPersistedData,
} from '../PersistedJob';

const defaultMsBetweenRetries = 15000; // a long time between retries, to avoid running multiple jobs at the same time, when one was postponed at the same time as one already planned (5s)
const defaultMaxAttempts = 2;

/**
 * We want to run each of those jobs at least 3 seconds apart.
 * So every time one of that job finishes, update this timestamp, so we know when adding a new job, what is the next minimun date to run it.
 */
let lastRunConfigSyncJobTimestamp: number | null = null;

async function confirmPushedAndDump(
  changes: Array<UserSuccessfulChange>,
  us: string
): Promise<void> {
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const variant = LibSessionUtil.userNamespaceToVariant(change.pushed.namespace);
    await GenericWrapperActions.confirmPushed(
      variant,
      change.pushed.seqno.toNumber(),
      change.updatedHash
    );
  }

  const { requiredUserVariants } = LibSessionUtil;
  for (let index = 0; index < requiredUserVariants.length; index++) {
    const variant = requiredUserVariants[index];
    const needsDump = await GenericWrapperActions.needsDump(variant);

    if (!needsDump) {
      continue;
    }
    const dump = await GenericWrapperActions.dump(variant);
    await ConfigDumpData.saveConfigDump({
      data: dump,
      publicKey: us,
      variant,
    });
  }
}

function triggerConfSyncJobDone() {
  window.Whisper.events.trigger(UserSyncJobDone);
}

function isPubkey(us: unknown): us is PubkeyType {
  return isString(us) && us.startsWith('05');
}

async function pushChangesToUserSwarmIfNeeded() {
  const us = UserUtils.getOurPubKeyStrFromCache();
  if (!isPubkey(us)) {
    throw new Error('invalid user pubkey, not right prefix');
  }

  // save the dumps to DB even before trying to push them, so at least we have an up to date dumps in the DB in case of crash, no network etc
  await LibSessionUtil.saveDumpsToDb(us);
  const changesToPush = await LibSessionUtil.pendingChangesForUs();

  // If there are no pending changes then the job can just complete (next time something
  // is updated we want to try and run immediately so don't schedule another run in this case)
  if (isEmpty(changesToPush?.messages)) {
    triggerConfSyncJobDone();
    return RunJobResult.Success;
  }

  const storeRequests = changesToPush.messages.map(m => {
    return new StoreUserConfigSubRequest({
      encryptedData: m.ciphertext,
      namespace: m.namespace,
      ttlMs: TTL_DEFAULT.CONFIG_MESSAGE,
    });
  });

  if (window.sessionFeatureFlags.debug.debugLibsessionDumps) {
    for (let index = 0; index < LibSessionUtil.requiredUserVariants.length; index++) {
      const variant = LibSessionUtil.requiredUserVariants[index];

      window.log.info(
        `pushChangesToUserSwarmIfNeeded: current dumps: ${variant}:`,
        to_hex(await GenericWrapperActions.dump(variant))
      );
    }
  }

  const deleteHashesSubRequest = changesToPush.allOldHashes.size
    ? new DeleteHashesFromUserNodeSubRequest({
        messagesHashes: [...changesToPush.allOldHashes],
      })
    : undefined;

  const result = await MessageSender.sendEncryptedDataToSnode({
    storeRequests,
    destination: us,
    deleteHashesSubRequest,
  });

  const expectedReplyLength =
    changesToPush.messages.length + (changesToPush.allOldHashes.size ? 1 : 0);
  // we do a sequence call here. If we do not have the right expected number of results, consider it a failure
  if (!isArray(result) || result.length !== expectedReplyLength) {
    window.log.info(
      `UserSyncJob: unexpected result length: expected ${expectedReplyLength} but got ${result?.length}`
    );
    // this might be a 421 error (already handled) so let's retry this request a little bit later
    return RunJobResult.RetryJobIfPossible;
  }

  const changes = LibSessionUtil.batchResultsToUserSuccessfulChange(result, changesToPush);
  if (isEmpty(changes)) {
    return RunJobResult.RetryJobIfPossible;
  }
  // Now that we have the successful changes, we need to mark them as pushed and
  // generate any config dumps which need to be stored

  await confirmPushedAndDump(changes, us);
  triggerConfSyncJobDone();
  return RunJobResult.Success;
}

class UserSyncJob extends PersistedJob<UserSyncPersistedData> {
  constructor({
    identifier,
    nextAttemptTimestamp,
    maxAttempts,
    currentRetry,
  }: Partial<
    Pick<
      UserSyncPersistedData,
      'identifier' | 'nextAttemptTimestamp' | 'currentRetry' | 'maxAttempts'
    >
  >) {
    super({
      jobType: 'UserSyncJobType',
      identifier: identifier || v4(),
      delayBetweenRetries: defaultMsBetweenRetries,
      maxAttempts: isNumber(maxAttempts) ? maxAttempts : defaultMaxAttempts,
      currentRetry: isNumber(currentRetry) ? currentRetry : 0,
      nextAttemptTimestamp: nextAttemptTimestamp || Date.now(),
    });
  }

  public async run(): Promise<RunJobResult> {
    const start = Date.now();

    try {
      window.log.debug(`UserSyncJob starting ${this.persistedData.identifier}`);

      const us = UserUtils.getOurPubKeyStrFromCache();
      const ed25519Key = await UserUtils.getUserED25519KeyPairBytes();
      const conversation = ConvoHub.use().get(us);
      if (!us || !conversation || !ed25519Key) {
        // we check for ed25519Key because it is needed for authenticated requests
        window.log.warn('did not find our own conversation');
        return RunJobResult.PermanentFailure;
      }

      return await UserSync.pushChangesToUserSwarmIfNeeded();
      // eslint-disable-next-line no-useless-catch
    } catch (e) {
      throw e;
    } finally {
      window.log.debug(`UserSyncJob run() took ${Date.now() - start}ms`);

      // this is a simple way to make sure whatever happens here, we update the lastest timestamp.
      // (a finally statement is always executed (no matter if exception or returns in other try/catch block)
      this.updateLastTickTimestamp();
    }
  }

  public serializeJob(): UserSyncPersistedData {
    const fromParent = super.serializeBase();
    return fromParent;
  }

  public addJobCheck(jobs: Array<UserSyncPersistedData>): AddJobCheckReturn {
    return this.addJobCheckSameTypePresent(jobs);
  }

  /**
   * For the SharedConfig job, we do not care about the jobs already in the list.
   * We never want to add a new sync configuration job if there is already one in the queue.
   * This is done by the `addJobCheck` method above
   */
  public nonRunningJobsToRemove(_jobs: Array<UserSyncPersistedData>) {
    return [];
  }

  public getJobTimeoutMs(): number {
    return 20000;
  }

  private updateLastTickTimestamp() {
    lastRunConfigSyncJobTimestamp = Date.now();
  }
}

/**
 * Queue a new Sync Configuration if needed job.
 * A UserSyncJob can only be added if there is none of the same type queued already.
 */
async function queueNewJobIfNeeded() {
  if (isSignInByLinking()) {
    window.log.info('NOT Scheduling ConfSyncJob: as we are linking a device');

    return;
  }
  if (
    !lastRunConfigSyncJobTimestamp ||
    lastRunConfigSyncJobTimestamp < Date.now() - defaultMsBetweenRetries
  ) {
    // window.log.debug('Scheduling ConfSyncJob: ASAP');
    // we postpone by 1000ms to make sure whoever is adding this job is done with what is needs to do first
    // this call will make sure that there is only one configuration sync job at all times
    await runners.userSyncRunner.addJob(
      new UserSyncJob({ nextAttemptTimestamp: Date.now() + 1000 })
    );
  } else {
    // if we did run at t=100, and it is currently t=110, the difference is 10
    const diff = Math.max(Date.now() - lastRunConfigSyncJobTimestamp, 0);
    // but we want to run every 30, so what we need is actually `30-10` from now = 20
    const leftBeforeNextTick = Math.max(defaultMsBetweenRetries - diff, 1000);
    // window.log.debug('Scheduling ConfSyncJob: LATER');

    await runners.userSyncRunner.addJob(
      new UserSyncJob({ nextAttemptTimestamp: Date.now() + leftBeforeNextTick })
    );
  }
}

export const UserSync = {
  UserSyncJob,
  pushChangesToUserSwarmIfNeeded,
  queueNewJobIfNeeded: () => allowOnlyOneAtATime('UserSyncJob-oneAtAtTime', queueNewJobIfNeeded),
};
