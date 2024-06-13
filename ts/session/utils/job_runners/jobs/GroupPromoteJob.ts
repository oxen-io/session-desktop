import { GroupPubkeyType, PubkeyType } from 'libsession_util_nodejs';
import { isNumber } from 'lodash';
import { v4 } from 'uuid';
import { UserUtils } from '../..';
import { groupInfoActions } from '../../../../state/ducks/metaGroups';
import {
  MetaGroupWrapperActions,
  UserGroupsWrapperActions,
} from '../../../../webworker/workers/browser/libsession_worker_interface';
import { SnodeNamespaces } from '../../../apis/snode_api/namespaces';
import { SnodeGroupSignature } from '../../../apis/snode_api/signature/groupSignature';
import { getMessageQueue } from '../../../sending';
import { PubKey } from '../../../types';
import { runners } from '../JobRunner';
import {
  AddJobCheckReturn,
  GroupPromotePersistedData,
  PersistedJob,
  RunJobResult,
} from '../PersistedJob';

const defaultMsBetweenRetries = 10000;
const defaultMaxAttemps = 1;

type JobExtraArgs = {
  groupPk: GroupPubkeyType;
  member: PubkeyType;
};

export function shouldAddJob(args: JobExtraArgs) {
  if (UserUtils.isUsFromCache(args.member)) {
    return false;
  }

  return true;
}

async function addJob({ groupPk, member }: JobExtraArgs) {
  if (shouldAddJob({ groupPk, member })) {
    const groupPromoteJob = new GroupPromoteJob({
      groupPk,
      member,
      nextAttemptTimestamp: Date.now(),
    });
    window.log.debug(`addGroupPromoteJob: adding group promote for ${groupPk}:${member} `);
    await runners.groupPromoteJobRunner.addJob(groupPromoteJob);
    window?.inboxStore?.dispatch(
      groupInfoActions.setPromotionPending({ groupPk, pubkey: member, sending: true })
    );
  }
}

class GroupPromoteJob extends PersistedJob<GroupPromotePersistedData> {
  constructor({
    groupPk,
    member,
    nextAttemptTimestamp,
    maxAttempts,
    currentRetry,
    identifier,
  }: Pick<GroupPromotePersistedData, 'groupPk' | 'member'> &
    Partial<
      Pick<
        GroupPromotePersistedData,
        | 'nextAttemptTimestamp'
        | 'identifier'
        | 'maxAttempts'
        | 'delayBetweenRetries'
        | 'currentRetry'
      >
    >) {
    super({
      jobType: 'GroupPromoteJobType',
      identifier: identifier || v4(),
      member,
      groupPk,
      delayBetweenRetries: defaultMsBetweenRetries,
      maxAttempts: isNumber(maxAttempts) ? maxAttempts : defaultMaxAttemps,
      nextAttemptTimestamp: nextAttemptTimestamp || Date.now() + defaultMsBetweenRetries,
      currentRetry: isNumber(currentRetry) ? currentRetry : 0,
    });
  }

  public async run(): Promise<RunJobResult> {
    const { groupPk, member, jobType, identifier } = this.persistedData;

    window.log.info(
      `running job ${jobType} with groupPk:"${groupPk}" member: ${member} id:"${identifier}" `
    );
    const group = await UserGroupsWrapperActions.getGroup(groupPk);
    if (!group || !group.secretKey || !group.name) {
      window.log.warn(`GroupPromoteJob: Did not find group in wrapper or no valid info in wrapper`);
      return RunJobResult.PermanentFailure;
    }

    if (UserUtils.isUsFromCache(member)) {
      return RunJobResult.Success;
    }
    let failed = true;
    try {
      const message = await SnodeGroupSignature.getGroupPromoteMessage({
        member,
        secretKey: group.secretKey,
        groupPk,
      });

      const storedAt = await getMessageQueue().sendTo1o1NonDurably({
        message,
        namespace: SnodeNamespaces.Default,
        pubkey: PubKey.cast(member),
      });
      if (storedAt !== null) {
        failed = false;
      }
    } finally {
      window?.inboxStore?.dispatch(
        groupInfoActions.setPromotionPending({ groupPk, pubkey: member, sending: false })
      );
      try {
        await MetaGroupWrapperActions.memberSetPromoted(groupPk, member, failed);
      } catch (e) {
        window.log.warn('GroupPromoteJob memberSetPromoted failed with', e.message);
      }
    }
    // return true so this job is marked as a success and we don't need to retry it
    return RunJobResult.Success;
  }

  public serializeJob(): GroupPromotePersistedData {
    return super.serializeBase();
  }

  public nonRunningJobsToRemove(_jobs: Array<GroupPromotePersistedData>) {
    return [];
  }

  public addJobCheck(jobs: Array<GroupPromotePersistedData>): AddJobCheckReturn {
    // avoid adding the same job if the exact same one is already planned
    const hasSameJob = jobs.some(j => {
      return j.groupPk === this.persistedData.groupPk && j.member === this.persistedData.member;
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

export const GroupPromote = {
  GroupPromoteJob,
  addJob,
};
