export type JobRunnerType =
  | 'UserSyncJob'
  | 'GroupSyncJob'
  | 'FetchMsgExpirySwarmJob'
  | 'UpdateMsgExpirySwarmJob'
  | 'FakeSleepForJob'
  | 'FakeSleepForMultiJob'
  | 'AvatarDownloadJob'
  | 'GroupInviteJob'
  | 'GroupPromoteJob'
  | 'GroupPendingRemovalJob';
