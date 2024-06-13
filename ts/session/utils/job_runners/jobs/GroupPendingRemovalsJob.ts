/* eslint-disable no-await-in-loop */
import { PubkeyType, WithGroupPubkey } from 'libsession_util_nodejs';
import { isEmpty, isNumber } from 'lodash';
import { v4 } from 'uuid';
import { StringUtils } from '../..';
import { Data } from '../../../../data/data';
import {
  deleteMessagesFromSwarmOnly,
  unsendMessagesForEveryoneGroupV2,
} from '../../../../interactions/conversations/unsendingInteractions';
import {
  MetaGroupWrapperActions,
  MultiEncryptWrapperActions,
  UserGroupsWrapperActions,
} from '../../../../webworker/workers/browser/libsession_worker_interface';
import { StoreGroupRevokedRetrievableSubRequest } from '../../../apis/snode_api/SnodeRequestTypes';
import { GetNetworkTime } from '../../../apis/snode_api/getNetworkTime';
import { RevokeChanges, SnodeAPIRevoke } from '../../../apis/snode_api/revokeSubaccount';
import { WithSecretKey } from '../../../apis/snode_api/types';
import { concatUInt8Array } from '../../../crypto';
import { MessageSender } from '../../../sending';
import { fromHexToArray } from '../../String';
import { runners } from '../JobRunner';
import {
  AddJobCheckReturn,
  GroupPendingRemovalsPersistedData,
  PersistedJob,
  RunJobResult,
} from '../PersistedJob';
import { GroupSync } from './GroupSyncJob';

export type WithAddWithoutHistoryMembers = { withoutHistory: Array<PubkeyType> };
export type WithAddWithHistoryMembers = { withHistory: Array<PubkeyType> };
export type WithRemoveMembers = { removed: Array<PubkeyType> };

const defaultMsBetweenRetries = 10000;
const defaultMaxAttemps = 1;

type JobExtraArgs = Pick<GroupPendingRemovalsPersistedData, 'groupPk'>;

async function addJob({ groupPk }: JobExtraArgs) {
  const pendingRemovalJob = new GroupPendingRemovalsJob({
    groupPk,
    nextAttemptTimestamp: Date.now(),
  });
  window.log.debug(`addGroupPendingRemovalJob: adding group pending removal for ${groupPk} `);
  await runners.groupPendingRemovalJobRunner.addJob(pendingRemovalJob);
}

async function getPendingRevokeParams({
  withoutHistory,
  withHistory,
  removed,
  groupPk,
  secretKey,
}: WithGroupPubkey &
  WithSecretKey &
  WithAddWithoutHistoryMembers &
  WithAddWithHistoryMembers &
  WithRemoveMembers) {
  const revokeChanges: RevokeChanges = [];
  const unrevokeChanges: RevokeChanges = [];

  for (let index = 0; index < withoutHistory.length; index++) {
    const m = withoutHistory[index];
    const token = await MetaGroupWrapperActions.swarmSubAccountToken(groupPk, m);
    unrevokeChanges.push({ action: 'unrevoke_subaccount', tokenToRevokeHex: token });
  }
  for (let index = 0; index < withHistory.length; index++) {
    const m = withHistory[index];
    const token = await MetaGroupWrapperActions.swarmSubAccountToken(groupPk, m);
    unrevokeChanges.push({ action: 'unrevoke_subaccount', tokenToRevokeHex: token });
  }
  for (let index = 0; index < removed.length; index++) {
    const m = removed[index];
    const token = await MetaGroupWrapperActions.swarmSubAccountToken(groupPk, m);
    revokeChanges.push({ action: 'revoke_subaccount', tokenToRevokeHex: token });
  }

  return SnodeAPIRevoke.getRevokeSubaccountParams(groupPk, secretKey, {
    revokeChanges,
    unrevokeChanges,
  });
}

class GroupPendingRemovalsJob extends PersistedJob<GroupPendingRemovalsPersistedData> {
  constructor({
    groupPk,
    nextAttemptTimestamp,
    maxAttempts,
    currentRetry,
    identifier,
  }: Pick<GroupPendingRemovalsPersistedData, 'groupPk'> &
    Partial<
      Pick<
        GroupPendingRemovalsPersistedData,
        | 'nextAttemptTimestamp'
        | 'identifier'
        | 'maxAttempts'
        | 'delayBetweenRetries'
        | 'currentRetry'
      >
    >) {
    super({
      jobType: 'GroupPendingRemovalJobType',
      identifier: identifier || v4(),
      groupPk,
      delayBetweenRetries: defaultMsBetweenRetries,
      maxAttempts: isNumber(maxAttempts) ? maxAttempts : defaultMaxAttemps,
      nextAttemptTimestamp: nextAttemptTimestamp || Date.now() + defaultMsBetweenRetries,
      currentRetry: isNumber(currentRetry) ? currentRetry : 0,
    });
  }

  public async run() {
    const { groupPk, jobType, identifier } = this.persistedData;

    window.log.info(`running job ${jobType} with groupPk:"${groupPk}" id:"${identifier}" `);
    const group = await UserGroupsWrapperActions.getGroup(groupPk);
    if (!group || !group.secretKey || isEmpty(group.secretKey)) {
      window.log.warn(
        `GroupPendingRemovalsJob: Did not find group in wrapper or no valid info in wrapper`
      );
      return RunJobResult.PermanentFailure;
    }

    try {
      const pendingRemovals = await MetaGroupWrapperActions.memberGetAllPendingRemovals(groupPk);

      if (!pendingRemovals.length) {
        return RunJobResult.Success;
      }
      const sessionIdsHex = pendingRemovals.map(m => m.pubkeyHex);
      const sessionIds = sessionIdsHex.map(m => fromHexToArray(m).slice(1));
      const currentGen = await MetaGroupWrapperActions.keyGetCurrentGen(groupPk);
      const dataToEncrypt = sessionIds.map(s => {
        return concatUInt8Array(s, StringUtils.stringToUint8Array(`${currentGen}`));
      });

      const multiEncryptedMessage = await MultiEncryptWrapperActions.multiEncrypt({
        messages: dataToEncrypt,
        recipients: sessionIds,
        ed25519SecretKey: group.secretKey,
        domain: 'SessionGroupKickedMessage',
      });
      // first, get revoke requests that need to be pushed for leaving member
      const revokeUnrevokeParams = await getPendingRevokeParams({
        groupPk,
        withHistory: [],
        withoutHistory: [],
        removed: sessionIdsHex,
        secretKey: group.secretKey,
      });

      const multiEncryptRequest = new StoreGroupRevokedRetrievableSubRequest({
        encryptedData: multiEncryptedMessage,
        groupPk,
        secretKey: group.secretKey,
      });

      const result = await MessageSender.sendEncryptedDataToSnode({
        storeRequests: [multiEncryptRequest],
        destination: groupPk,
        ...revokeUnrevokeParams,
      });

      if (result?.length === 2 && result[0].code === 200 && result[1].code === 200) {
        // both requests success, remove the members from the group member entirely and sync
        await MetaGroupWrapperActions.memberEraseAndRekey(groupPk, sessionIdsHex);
        await GroupSync.queueNewJobIfNeeded(groupPk);
        const deleteMessagesOf = pendingRemovals
          .filter(m => m.removedStatus === 2)
          .map(m => m.pubkeyHex);
        if (deleteMessagesOf.length) {
          const msgHashesToDeleteOnGroupSwarm =
            await Data.deleteAllMessageFromSendersInConversation({
              groupPk,
              toRemove: sessionIdsHex,
              signatureTimestamp: GetNetworkTime.now(),
            });

          await unsendMessagesForEveryoneGroupV2({
            allMessagesFrom: deleteMessagesOf,
            groupPk,
            msgsToDelete: [],
          });
          if (msgHashesToDeleteOnGroupSwarm.length) {
            await deleteMessagesFromSwarmOnly(msgHashesToDeleteOnGroupSwarm, groupPk);
          }
        }
      }
    } catch (e) {
      window.log.warn('PendingRemovalJob failed with', e.message);
      return RunJobResult.RetryJobIfPossible;
    }
    // return true so this job is marked as a success and we don't need to retry it
    return RunJobResult.Success;
  }

  public serializeJob() {
    return super.serializeBase();
  }

  public nonRunningJobsToRemove(_jobs: Array<GroupPendingRemovalsPersistedData>) {
    return [];
  }

  public addJobCheck(jobs: Array<GroupPendingRemovalsPersistedData>): AddJobCheckReturn {
    // avoid adding the same job if the exact same one is already planned
    const hasSameJob = jobs.some(j => {
      return j.groupPk === this.persistedData.groupPk;
    });

    if (hasSameJob) {
      return 'skipAddSameJobPresent';
    }

    return null;
  }

  public getJobTimeoutMs(): number {
    return 15000;
  }
}

export const GroupPendingRemovals = {
  addJob,
  getPendingRevokeParams,
};
