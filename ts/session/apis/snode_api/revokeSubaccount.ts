import { GroupPubkeyType } from 'libsession_util_nodejs';

import { PubKey } from '../../types';
import { SubaccountRevokeSubRequest, SubaccountUnrevokeSubRequest } from './SnodeRequestTypes';
import { GetNetworkTime } from './getNetworkTime';

export type RevokeChanges = Array<{
  action: 'revoke_subaccount' | 'unrevoke_subaccount';
  tokenToRevokeHex: string;
}>;

async function getRevokeSubaccountParams(
  groupPk: GroupPubkeyType,
  secretKey: Uint8Array,
  {
    revokeChanges,
    unrevokeChanges,
  }: { revokeChanges: RevokeChanges; unrevokeChanges: RevokeChanges }
) {
  if (!PubKey.is03Pubkey(groupPk)) {
    throw new Error('revokeSubaccountForGroup: not a 03 group');
  }

  const revokeSubRequest = revokeChanges.length
    ? new SubaccountRevokeSubRequest({
        groupPk,
        revokeTokenHex: revokeChanges.map(m => m.tokenToRevokeHex),
        timestamp: GetNetworkTime.now(),
        secretKey,
      })
    : undefined;
  const unrevokeSubRequest = unrevokeChanges.length
    ? new SubaccountUnrevokeSubRequest({
        groupPk,
        revokeTokenHex: unrevokeChanges.map(m => m.tokenToRevokeHex),
        timestamp: GetNetworkTime.now(),
        secretKey,
      })
    : undefined;

  return {
    revokeSubRequest,
    unrevokeSubRequest,
  };
}

export const SnodeAPIRevoke = { getRevokeSubaccountParams };
