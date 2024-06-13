/* eslint-disable no-await-in-loop */
import { GroupPubkeyType, WithGroupPubkey } from 'libsession_util_nodejs';
import { to_hex } from 'libsodium-wrappers-sumo';
import { compact, isArray, isEmpty, isNumber } from 'lodash';
import { UserUtils } from '../..';
import { assertUnreachable } from '../../../../types/sqlSharedTypes';
import { isSignInByLinking } from '../../../../util/storage';
import {
  MetaGroupWrapperActions,
  UserGroupsWrapperActions,
} from '../../../../webworker/workers/browser/libsession_worker_interface';
import {
  DeleteAllFromGroupMsgNodeSubRequest,
  StoreGroupKeysSubRequest,
  StoreGroupMessageSubRequest,
} from '../../../apis/snode_api/SnodeRequestTypes';
import { DeleteGroupHashesFactory } from '../../../apis/snode_api/factories/DeleteGroupHashesRequestFactory';
import { StoreGroupRequestFactory } from '../../../apis/snode_api/factories/StoreGroupRequestFactory';
import { SnodeNamespaces } from '../../../apis/snode_api/namespaces';
import { WithRevokeSubRequest } from '../../../apis/snode_api/types';
import { ConvoHub } from '../../../conversations';
import { MessageSender } from '../../../sending/MessageSender';
import { PubKey } from '../../../types';
import { allowOnlyOneAtATime } from '../../Promise';
import { ed25519Str } from '../../String';
import { GroupSuccessfulChange, LibSessionUtil } from '../../libsession/libsession_utils';
import { runners } from '../JobRunner';
import {
  AddJobCheckReturn,
  GroupSyncPersistedData,
  PersistedJob,
  RunJobResult,
} from '../PersistedJob';

const defaultMsBetweenRetries = 15000; // a long time between retries, to avoid running multiple jobs at the same time, when one was postponed at the same time as one already planned (5s)
const defaultMaxAttempts = 2;

/**
 * We want to run each of those jobs at least 3 seconds apart.
 * So every time one of that job finishes, update this timestamp, so we know when adding a new job, what is the next minimun date to run it.
 */
const lastRunConfigSyncJobTimestamps = new Map<string, number | null>();

async function confirmPushedAndDump(
  changes: Array<GroupSuccessfulChange>,
  groupPk: GroupPubkeyType
): Promise<void> {
  const toConfirm: Parameters<typeof MetaGroupWrapperActions.metaConfirmPushed> = [
    groupPk,
    { groupInfo: null, groupMember: null },
  ];
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const namespace = change.pushed.namespace;
    switch (namespace) {
      case SnodeNamespaces.ClosedGroupInfo: {
        if (change.pushed.seqno) {
          toConfirm[1].groupInfo = [change.pushed.seqno.toNumber(), change.updatedHash];
        }
        break;
      }
      case SnodeNamespaces.ClosedGroupMembers: {
        toConfirm[1].groupMember = [change.pushed.seqno.toNumber(), change.updatedHash];
        break;
      }
      case SnodeNamespaces.ClosedGroupKeys: {
        // TODO chunk 2 closed group
        break;
      }
      default:
        assertUnreachable(namespace, 'buildAndSaveDumpsToDB assertUnreachable');
    }
  }

  await MetaGroupWrapperActions.metaConfirmPushed(...toConfirm);
  return LibSessionUtil.saveDumpsToDb(groupPk);
}

async function pushChangesToGroupSwarmIfNeeded({
  revokeSubRequest,
  unrevokeSubRequest,
  groupPk,
  supplementalKeysSubRequest,
  deleteAllMessagesSubRequest,
  extraStoreRequests,
}: WithGroupPubkey &
  WithRevokeSubRequest & {
    supplementalKeysSubRequest?: StoreGroupKeysSubRequest;
    deleteAllMessagesSubRequest?: DeleteAllFromGroupMsgNodeSubRequest;
    extraStoreRequests: Array<StoreGroupMessageSubRequest>;
  }): Promise<RunJobResult> {
  // save the dumps to DB even before trying to push them, so at least we have an up to date dumps in the DB in case of crash, no network etc
  await LibSessionUtil.saveDumpsToDb(groupPk);
  const { allOldHashes, messages: pendingConfigData } =
    await LibSessionUtil.pendingChangesForGroup(groupPk);
  // If there are no pending changes nor any requests to be made,
  // then the job can just complete (next time something is updated we want
  // to try and run immediately so don't schedule another run in this case)
  if (
    isEmpty(pendingConfigData) &&
    isEmpty(supplementalKeysSubRequest) &&
    isEmpty(revokeSubRequest) &&
    isEmpty(unrevokeSubRequest) &&
    isEmpty(deleteAllMessagesSubRequest) &&
    isEmpty(extraStoreRequests)
  ) {
    window.log.debug(`pushChangesToGroupSwarmIfNeeded: ${ed25519Str(groupPk)}: nothing to push`);
    return RunJobResult.Success;
  }

  const group = await UserGroupsWrapperActions.getGroup(groupPk);
  if (!group) {
    window.log.debug(`pushChangesToGroupSwarmIfNeeded: ${ed25519Str(groupPk)}: group not found`);
    return RunJobResult.Success;
  }

  if (window.sessionFeatureFlags.debug.debugLibsessionDumps) {
    const dumps = await MetaGroupWrapperActions.metaMakeDump(groupPk);
    window.log.info(
      `pushChangesToGroupSwarmIfNeeded: current metadump: ${ed25519Str(groupPk)}:`,
      to_hex(dumps)
    );
  }

  const pendingConfigRequests = StoreGroupRequestFactory.makeStoreGroupConfigSubRequest({
    group,
    pendingConfigData,
  });

  const deleteHashesSubRequest = DeleteGroupHashesFactory.makeGroupHashesToDeleteSubRequest({
    group,
    messagesHashes: allOldHashes,
  });

  const result = await MessageSender.sendEncryptedDataToSnode({
    // Note: this is on purpose that supplementalKeysSubRequest is before pendingConfigRequests
    // as this is to avoid a race condition where a device is polling right
    // while we are posting the configs (already encrypted with the new keys)
    storeRequests: compact([
      supplementalKeysSubRequest,
      ...pendingConfigRequests,
      ...extraStoreRequests,
    ]),
    destination: groupPk,
    deleteHashesSubRequest,
    revokeSubRequest,
    unrevokeSubRequest,
    deleteAllMessagesSubRequest,
  });

  const expectedReplyLength =
    pendingConfigRequests.length + // each of those are sent as a subrequest
    (supplementalKeysSubRequest ? 1 : 0) + // we are sending all the supplemental keys as a single subrequest
    (deleteHashesSubRequest ? 1 : 0) + // we are sending all hashes changes as a single subrequest
    (revokeSubRequest ? 1 : 0) + // we are sending all revoke updates as a single subrequest
    (unrevokeSubRequest ? 1 : 0) + // we are sending all revoke updates as a single subrequest
    (deleteAllMessagesSubRequest ? 1 : 0) + // a delete_all sub request is a single subrequest
    (extraStoreRequests ? 1 : 0); // each of those are sent as a subrequest

  // we do a sequence call here. If we do not have the right expected number of results, consider it a failure
  if (!isArray(result) || result.length !== expectedReplyLength) {
    window.log.info(
      `GroupSyncJob: unexpected result length: expected ${expectedReplyLength} but got ${result?.length}`
    );

    // this might be a 421 error (already handled) so let's retry this request a little bit later
    return RunJobResult.RetryJobIfPossible;
  }

  const changes = LibSessionUtil.batchResultsToGroupSuccessfulChange(result, {
    allOldHashes,
    messages: pendingConfigData,
  });

  if (isEmpty(changes)) {
    return RunJobResult.RetryJobIfPossible;
  }

  // Now that we have the successful changes, we need to mark them as pushed and
  // generate any config dumps which need to be stored
  await confirmPushedAndDump(changes, groupPk);
  return RunJobResult.Success;
}

class GroupSyncJob extends PersistedJob<GroupSyncPersistedData> {
  constructor({
    identifier, // this has to be the pubkey to which we
    nextAttemptTimestamp,
    maxAttempts,
    currentRetry,
  }: Pick<GroupSyncPersistedData, 'identifier'> &
    Partial<
      Pick<GroupSyncPersistedData, 'nextAttemptTimestamp' | 'currentRetry' | 'maxAttempts'>
    >) {
    super({
      jobType: 'GroupSyncJobType',
      identifier,
      delayBetweenRetries: defaultMsBetweenRetries,
      maxAttempts: isNumber(maxAttempts) ? maxAttempts : defaultMaxAttempts,
      currentRetry: isNumber(currentRetry) ? currentRetry : 0,
      nextAttemptTimestamp: nextAttemptTimestamp || Date.now(),
    });
  }

  public async run(): Promise<RunJobResult> {
    const start = Date.now();
    const thisJobDestination = this.persistedData.identifier;

    try {
      if (!PubKey.is03Pubkey(thisJobDestination)) {
        return RunJobResult.PermanentFailure;
      }

      window.log.debug(`GroupSyncJob starting ${thisJobDestination}`);

      const us = UserUtils.getOurPubKeyStrFromCache();
      const ed25519Key = await UserUtils.getUserED25519KeyPairBytes();
      const conversation = ConvoHub.use().get(us);
      if (!us || !conversation || !ed25519Key) {
        // we check for ed25519Key because it is needed for authenticated requests
        window.log.warn('did not find our own conversation');
        return RunJobResult.PermanentFailure;
      }

      // return await so we catch exceptions in here
      return await GroupSync.pushChangesToGroupSwarmIfNeeded({
        groupPk: thisJobDestination,
        extraStoreRequests: [],
      });

      // eslint-disable-next-line no-useless-catch
    } catch (e) {
      throw e;
    } finally {
      window.log.debug(
        `GroupSyncJob ${ed25519Str(thisJobDestination)} run() took ${Date.now() - start}ms`
      );

      // this is a simple way to make sure whatever happens here, we update the lastest timestamp.
      // (a finally statement is always executed (no matter if exception or returns in other try/catch block)
      this.updateLastTickTimestamp();
    }
  }

  public serializeJob(): GroupSyncPersistedData {
    const fromParent = super.serializeBase();
    return fromParent;
  }

  public addJobCheck(jobs: Array<GroupSyncPersistedData>): AddJobCheckReturn {
    return this.addJobCheckSameTypeAndIdentifierPresent(jobs);
  }

  public nonRunningJobsToRemove(_jobs: Array<GroupSyncPersistedData>) {
    return [];
  }

  public getJobTimeoutMs(): number {
    return 20000;
  }

  private updateLastTickTimestamp() {
    lastRunConfigSyncJobTimestamps.set(this.persistedData.identifier, Date.now());
  }
}

/**
 * Queue a new Sync Configuration if needed job.
 * A GroupSyncJob can only be added if there is none of the same type queued already.
 */
async function queueNewJobIfNeeded(groupPk: GroupPubkeyType) {
  if (isSignInByLinking()) {
    window.log.info(`NOT Scheduling GroupSyncJob for ${groupPk} as we are linking a device`);

    return;
  }
  const lastRunConfigSyncJobTimestamp = lastRunConfigSyncJobTimestamps.get(groupPk);
  if (
    !lastRunConfigSyncJobTimestamp ||
    lastRunConfigSyncJobTimestamp < Date.now() - defaultMsBetweenRetries
  ) {
    // window.log.debug('Scheduling GroupSyncJob: ASAP');
    // we postpone by 1000ms to make sure whoever is adding this job is done with what is needs to do first
    // this call will make sure that there is only one configuration sync job at all times
    await runners.groupSyncRunner.addJob(
      new GroupSyncJob({ identifier: groupPk, nextAttemptTimestamp: Date.now() + 1000 })
    );
    return;
  }

  // if we did run at t=100, and it is currently t=110, the difference is 10
  const diff = Math.max(Date.now() - lastRunConfigSyncJobTimestamp, 0);
  // but we want to run every 30, so what we need is actually `30-10` from now = 20
  const leftBeforeNextTick = Math.max(defaultMsBetweenRetries - diff, 1000);
  // window.log.debug('Scheduling GroupSyncJob: LATER');

  await runners.groupSyncRunner.addJob(
    new GroupSyncJob({
      identifier: groupPk,
      nextAttemptTimestamp: Date.now() + leftBeforeNextTick,
    })
  );
}

export const GroupSync = {
  GroupSyncJob,
  pushChangesToGroupSwarmIfNeeded,
  queueNewJobIfNeeded: (groupPk: GroupPubkeyType) =>
    allowOnlyOneAtATime(`GroupSyncJob-oneAtAtTime-${groupPk}`, () => queueNewJobIfNeeded(groupPk)),
};
