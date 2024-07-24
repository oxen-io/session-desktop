import {
  GroupPubkeyType,
  PubkeyType,
  Uint8ArrayLen100,
  Uint8ArrayLen64,
  UserGroupsGet,
  WithGroupPubkey,
} from 'libsession_util_nodejs';
import { isEmpty, isString } from 'lodash';
import { MetaGroupWrapperActions } from '../../../../webworker/workers/browser/libsession_worker_interface';
import { GroupUpdateInviteMessage } from '../../../messages/outgoing/controlMessage/group_v2/to_user/GroupUpdateInviteMessage';
import { GroupUpdatePromoteMessage } from '../../../messages/outgoing/controlMessage/group_v2/to_user/GroupUpdatePromoteMessage';
import { StringUtils, UserUtils } from '../../../utils';
import { fromUInt8ArrayToBase64, stringToUint8Array } from '../../../utils/String';
import { PreConditionFailed } from '../../../utils/errors';
import { GetNetworkTime } from '../getNetworkTime';
import { SnodeNamespacesGroup } from '../namespaces';
import { SignedGroupHashesParams, WithMessagesHashes, WithShortenOrExtend } from '../types';
import { SignatureShared } from './signatureShared';
import { SnodeSignatureResult } from './snodeSignatures';
import { getSodiumRenderer } from '../../../crypto';

async function getGroupInviteMessage({
  groupName,
  member,
  secretKey,
  groupPk,
}: {
  member: PubkeyType;
  groupName: string;
  secretKey: Uint8ArrayLen64; // len 64
  groupPk: GroupPubkeyType;
}) {
  const sodium = await getSodiumRenderer();
  const createAtNetworkTimestamp = GetNetworkTime.now();

  if (UserUtils.isUsFromCache(member)) {
    throw new Error('getGroupInviteMessage: we cannot invite ourselves');
  }

  // Note: as the signature is built with the timestamp here, we cannot override the timestamp later on the sending pipeline
  const adminSignature = sodium.crypto_sign_detached(
    stringToUint8Array(`INVITE${member}${createAtNetworkTimestamp}`),
    secretKey
  );
  const memberAuthData = await MetaGroupWrapperActions.makeSwarmSubAccount(groupPk, member);

  const invite = new GroupUpdateInviteMessage({
    groupName,
    groupPk,
    createAtNetworkTimestamp,
    adminSignature,
    memberAuthData,
    expirationType: 'unknown', // an invite is not expiring
    expireTimer: 0,
  });
  return invite;
}

async function getGroupPromoteMessage({
  member,
  secretKey,
  groupPk,
  groupName,
}: {
  member: PubkeyType;
  secretKey: Uint8ArrayLen64; // len 64
  groupPk: GroupPubkeyType;
  groupName: string;
}) {
  const createAtNetworkTimestamp = GetNetworkTime.now();

  if (UserUtils.isUsFromCache(member)) {
    throw new Error('getGroupPromoteMessage: we cannot promote ourselves');
  }

  const msg = new GroupUpdatePromoteMessage({
    groupPk,
    createAtNetworkTimestamp,
    groupIdentitySeed: secretKey.slice(0, 32), // the seed is the first 32 bytes of the secretkey
    expirationType: 'unknown', // a promote message is not expiring
    expireTimer: 0,
    groupName,
  });
  return msg;
}

type ParamsShared = {
  groupPk: GroupPubkeyType;
  namespace: SnodeNamespacesGroup;
  method: 'retrieve' | 'store' | 'delete_all';
};

type SigParamsAdmin = ParamsShared & {
  groupIdentityPrivKey: Uint8ArrayLen64;
};

type SigParamsSubaccount = ParamsShared & {
  authData: Uint8ArrayLen100;
};

export type SigResultAdmin = Pick<SnodeSignatureResult, 'signature' | 'timestamp'> & {
  pubkey: GroupPubkeyType; // this is the 03 pubkey of the corresponding group
};

export type SigResultSubAccount = SigResultAdmin & {
  subaccount: string;
  subaccount_sig: string;
};

async function getSnodeGroupSubAccountSignatureParams(
  params: SigParamsSubaccount
): Promise<SigResultSubAccount> {
  const { signatureTimestamp, toSign } =
    SignatureShared.getVerificationDataForStoreRetrieve(params);

  const sigResult = await MetaGroupWrapperActions.swarmSubaccountSign(
    params.groupPk,
    toSign,
    params.authData
  );
  return {
    ...sigResult,
    timestamp: signatureTimestamp,
    pubkey: params.groupPk,
  };
}

async function getSnodeGroupAdminSignatureParams(params: SigParamsAdmin): Promise<SigResultAdmin> {
  const sigData = await SignatureShared.getSnodeSignatureShared({
    pubKey: params.groupPk,
    method: params.method,
    namespace: params.namespace,
    privKey: params.groupIdentityPrivKey,
  });
  return { ...sigData, pubkey: params.groupPk };
}

export type GroupDetailsNeededForSignature = Pick<
  UserGroupsGet,
  'pubkeyHex' | 'authData' | 'secretKey'
>;

type StoreOrRetrieve = { method: 'store' | 'retrieve'; namespace: SnodeNamespacesGroup };
type DeleteHashes = { method: 'delete'; hashes: Array<string> };
type DeleteAllNonConfigs = { method: 'delete_all'; namespace: SnodeNamespacesGroup };

async function getSnodeGroupSignature({
  group,
  ...args
}: {
  group: GroupDetailsNeededForSignature | null;
} & (StoreOrRetrieve | DeleteHashes | DeleteAllNonConfigs)): Promise<
  SigResultSubAccount | SigResultAdmin
> {
  if (!group) {
    throw new Error(`getSnodeGroupSignature: we need GroupDetailsNeededForSignature`);
  }
  const { pubkeyHex: groupPk, secretKey, authData } = group;

  const groupSecretKey = secretKey && !isEmpty(secretKey) ? secretKey : null;
  const groupAuthData = authData && !isEmpty(authData) ? authData : null;

  if (args.method === 'delete_all' && isEmpty(secretKey)) {
    throw new Error('getSnodeGroupSignature: delete_all needs an adminSecretKey');
  }

  if (groupSecretKey) {
    if (args.method === 'delete') {
      return getGroupSignatureByHashesParams({
        groupPk,
        method: args.method,
        messagesHashes: args.hashes,
        group,
      });
    }
    return getSnodeGroupAdminSignatureParams({
      method: args.method,
      namespace: args.namespace,
      groupPk,
      groupIdentityPrivKey: groupSecretKey,
    });
  }
  if (groupAuthData) {
    if (args.method === 'delete') {
      return getGroupSignatureByHashesParams({
        groupPk,
        method: args.method,
        messagesHashes: args.hashes,
        group,
      });
    }
    return getSnodeGroupSubAccountSignatureParams({
      groupPk,
      method: args.method,
      namespace: args.namespace,
      authData: groupAuthData,
    });
  }
  throw new Error(`getSnodeGroupSignature: needs either groupSecretKey or authData`);
}

async function signDataWithAdminSecret(
  verificationString: string | Uint8Array,
  group: Pick<GroupDetailsNeededForSignature, 'secretKey'>
) {
  const verificationData = isString(verificationString)
    ? StringUtils.encode(verificationString, 'utf8')
    : verificationString;
  const message = new Uint8Array(verificationData);

  if (!group) {
    throw new Error('signDataWithAdminSecret group was not found');
  }
  const { secretKey } = group;

  const groupSecretKey = secretKey && !isEmpty(secretKey) ? secretKey : null;
  if (!groupSecretKey) {
    throw new Error('groupSecretKey is empty');
  }
  const sodium = await getSodiumRenderer();

  return {
    signature: fromUInt8ArrayToBase64(sodium.crypto_sign_detached(message, groupSecretKey)),
  };
}

// this is kind of duplicated with `generateUpdateExpirySignature`, but needs to use the authData when secretKey is not available
async function generateUpdateExpiryGroupSignature({
  shortenOrExtend,
  expiryMs,
  messagesHashes,
  group,
}: WithMessagesHashes &
  WithShortenOrExtend & {
    group: GroupDetailsNeededForSignature | null;
    expiryMs: number;
  }) {
  if (!group || isEmpty(group.pubkeyHex)) {
    throw new PreConditionFailed('generateUpdateExpiryGroupSignature groupPk is empty');
  }

  // "expire" || ShortenOrExtend || expiry || messages[0] || ... || messages[N]
  const verificationString = `expire${shortenOrExtend}${expiryMs}${messagesHashes.join('')}`;
  const verificationData = StringUtils.encode(verificationString, 'utf8');
  const message = new Uint8Array(verificationData);

  if (!group) {
    throw new Error('generateUpdateExpiryGroupSignature group was not found');
  }
  const { pubkeyHex: groupPk, secretKey, authData } = group;

  const groupSecretKey = secretKey && !isEmpty(secretKey) ? secretKey : null;
  const groupAuthData = authData && !isEmpty(authData) ? authData : null;
  if (!groupSecretKey && !groupAuthData) {
    throw new Error(`retrieveRequestForGroup: needs either groupSecretKey or authData`);
  }

  const sodium = await getSodiumRenderer();
  const shared = { expiry: expiryMs, pubkey: groupPk }; // expiry and the other fields come from what the expire endpoint expects

  if (groupSecretKey) {
    return {
      signature: fromUInt8ArrayToBase64(sodium.crypto_sign_detached(message, groupSecretKey)),
      ...shared,
    };
  }
  if (!groupAuthData) {
    // typescript should see this already but doesn't, so let's enforce it.
    throw new Error(
      `retrieveRequestForGroup: needs either groupSecretKey or authData but both are empty`
    );
  }
  const subaccountSign = await MetaGroupWrapperActions.swarmSubaccountSign(
    groupPk,
    message,
    groupAuthData
  );
  return {
    ...subaccountSign,
    ...shared,
  };
}

async function getGroupSignatureByHashesParams({
  messagesHashes,
  method,
  group,
}: WithMessagesHashes &
  WithGroupPubkey & {
    method: 'delete';
    group: GroupDetailsNeededForSignature;
  }): Promise<SignedGroupHashesParams> {
  const verificationString = `${method}${messagesHashes.join('')}`;
  const message = new Uint8Array(StringUtils.encode(verificationString, 'utf8'));
  const signatureTimestamp = GetNetworkTime.now();

  const sodium = await getSodiumRenderer();
  try {
    if (group.secretKey && !isEmpty(group.secretKey)) {
      const signature = sodium.crypto_sign_detached(message, group.secretKey);
      const signatureBase64 = fromUInt8ArrayToBase64(signature);

      return {
        signature: signatureBase64,
        pubkey: group.pubkeyHex,
        messages: messagesHashes,
        timestamp: signatureTimestamp,
      };
    }

    throw new Error('getSnodeGroupSignatureByHashesParams needs admin secretKey  set');
  } catch (e) {
    window.log.warn('getSnodeGroupSignatureByHashesParams failed with: ', e.message);
    throw e;
  }
}

export const SnodeGroupSignature = {
  generateUpdateExpiryGroupSignature,
  getGroupInviteMessage,
  getGroupPromoteMessage,
  getSnodeGroupSignature,
  getGroupSignatureByHashesParams,
  signDataWithAdminSecret,
};
