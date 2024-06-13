import ByteBuffer from 'bytebuffer';
import { GroupPubkeyType, PubkeyType, WithGroupPubkey } from 'libsession_util_nodejs';
import { from_hex } from 'libsodium-wrappers-sumo';
import { isEmpty, isString } from 'lodash';
import { AwaitedReturn, assertUnreachable } from '../../../types/sqlSharedTypes';
import { concatUInt8Array } from '../../crypto';
import { PubKey } from '../../types';
import { StringUtils, UserUtils } from '../../utils';
import { ed25519Str } from '../../utils/String';
import { GetNetworkTime } from './getNetworkTime';
import {
  SnodeNamespace,
  SnodeNamespaces,
  SnodeNamespacesGroup,
  SnodeNamespacesGroupConfig,
  SnodeNamespacesUser,
  SnodeNamespacesUserConfig,
} from './namespaces';
import { GroupDetailsNeededForSignature, SnodeGroupSignature } from './signature/groupSignature';
import { SnodeSignature } from './signature/snodeSignatures';
import {
  ShortenOrExtend,
  WithMessagesHashes,
  WithSecretKey,
  WithSignature,
  WithTimestamp,
} from './types';
import { TTL_DEFAULT } from '../../constants';

type WithMaxSize = { max_size?: number };
export type WithShortenOrExtend = { shortenOrExtend: 'shorten' | 'extend' | '' };

abstract class SnodeAPISubRequest {
  public abstract method: string;
  public abstract loggingId(): string;
}

/**
 * Retrieve for legacy was not authenticated
 */
export class RetrieveLegacyClosedGroupSubRequest extends SnodeAPISubRequest {
  method = 'retrieve' as const;
  public readonly legacyGroupPk: PubkeyType;
  public readonly last_hash: string;
  public readonly max_size: number | undefined;
  public readonly namespace = SnodeNamespaces.LegacyClosedGroup;

  constructor({
    last_hash,
    legacyGroupPk,
    max_size,
  }: WithMaxSize & { last_hash: string; legacyGroupPk: PubkeyType }) {
    super();
    this.legacyGroupPk = legacyGroupPk;
    this.last_hash = last_hash;
    this.max_size = max_size;
  }

  public build() {
    return {
      method: this.method,
      params: {
        namespace: this.namespace, // legacy closed groups retrieve are not authenticated because the clients do not have a shared key
        pubkey: this.legacyGroupPk,
        last_hash: this.last_hash,
        max_size: this.max_size,
        // if we give a timestamp, a signature will be requested by the snode so this request for legacy does not take a timestamp
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${SnodeNamespace.toRole(this.namespace)}`;
  }
}

/**
 * If you are thinking of adding the `limit` field here: don't.
 * We fetch the full list because we will remove from every cached swarms the snodes not found in that fresh list.
 * If a `limit` was set, we would remove a lot of valid snodes from those cached swarms.
 */
type FetchSnodeListParams = {
  active_only: true;
  fields: {
    public_ip: true;
    storage_port: true;
    pubkey_x25519: true;
    pubkey_ed25519: true;
  };
};

export type GetServicesNodesFromSeedRequest = {
  method: 'get_n_service_nodes';
  jsonrpc: '2.0';
  /**
   * If you are thinking of adding the `limit` field here: don't.
   * We fetch the full list because we will remove from every cached swarms the snodes not found in that fresh list.
   * If the limit was set, we would remove a lot of valid snodes from the swarms we've already fetched.
   */
  params: FetchSnodeListParams;
};

export class RetrieveUserSubRequest extends SnodeAPISubRequest {
  public method = 'retrieve' as const;
  public readonly last_hash: string;
  public readonly max_size: number | undefined;
  public readonly namespace: SnodeNamespacesUser | SnodeNamespacesUserConfig;

  constructor({
    last_hash,
    max_size,
    namespace,
  }: WithMaxSize & {
    last_hash: string;
    namespace: SnodeNamespacesUser | SnodeNamespacesUserConfig;
  }) {
    super();
    this.last_hash = last_hash;
    this.max_size = max_size;
    this.namespace = namespace;
  }

  public async build() {
    const { pubkey, pubkey_ed25519, signature, timestamp } =
      await SnodeSignature.getSnodeSignatureParamsUs({
        method: this.method,
        namespace: this.namespace,
      });

    return {
      method: this.method,
      params: {
        namespace: this.namespace,
        pubkey,
        pubkey_ed25519,
        signature,
        timestamp, // we give a timestamp to force verification of the signature provided
        last_hash: this.last_hash,
        max_size: this.max_size,
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${SnodeNamespace.toRole(this.namespace)}`;
  }
}

/**
 * Build and sign a request with either the admin key if we have it, or with our subaccount details
 */
export class RetrieveGroupSubRequest extends SnodeAPISubRequest {
  public method = 'retrieve' as const;
  public readonly last_hash: string;
  public readonly max_size: number | undefined;
  public readonly namespace: SnodeNamespacesGroup;
  public readonly groupDetailsNeededForSignature: GroupDetailsNeededForSignature | null;

  constructor({
    last_hash,
    max_size,
    namespace,
    groupDetailsNeededForSignature,
  }: WithMaxSize & {
    last_hash: string;
    namespace: SnodeNamespacesGroup;
    groupDetailsNeededForSignature: GroupDetailsNeededForSignature | null;
  }) {
    super();
    this.last_hash = last_hash;
    this.max_size = max_size;
    this.namespace = namespace;
    this.groupDetailsNeededForSignature = groupDetailsNeededForSignature;
  }

  public async build() {
    /**
     * This will return the signature details we can use with the admin secretKey if we have it,
     * or with the subaccount details if we don't.
     * If there is no valid groupDetails, this throws
     */
    const sigResult = await SnodeGroupSignature.getSnodeGroupSignature({
      method: this.method,
      namespace: this.namespace,
      group: this.groupDetailsNeededForSignature,
    });

    return {
      method: this.method,
      params: {
        namespace: this.namespace,
        ...sigResult,
        last_hash: this.last_hash,
        max_size: this.max_size,
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${SnodeNamespace.toRole(this.namespace)}`;
  }
}

export class OnsResolveSubRequest extends SnodeAPISubRequest {
  public method = 'oxend_request' as const;
  public readonly base64EncodedNameHash: string;

  constructor(base64EncodedNameHash: string) {
    super();
    this.base64EncodedNameHash = base64EncodedNameHash;
  }

  public build() {
    return {
      method: this.method,
      params: {
        endpoint: 'ons_resolve',
        params: {
          type: 0,
          name_hash: this.base64EncodedNameHash,
        },
      },
    };
  }

  public loggingId(): string {
    return `${this.method}`;
  }
}

export class GetServiceNodesSubRequest extends SnodeAPISubRequest {
  public method = 'oxend_request' as const;

  public build() {
    return {
      method: this.method,
      params: {
        /**
         * If you are thinking of adding the `limit` field here: don't.
         * We fetch the full list because we will remove from every cached swarms the snodes not found in that fresh list.
         * If the limit was set, we would remove a lot of valid snodes from the swarms we've already fetched.
         */
        endpoint: 'get_service_nodes' as const,
        params: {
          active_only: true,
          fields: {
            public_ip: true,
            storage_port: true,
            pubkey_x25519: true,
            pubkey_ed25519: true,
          },
        },
      },
    };
  }

  public loggingId(): string {
    return `${this.method}`;
  }
}

export class SwarmForSubRequest extends SnodeAPISubRequest {
  public method = 'get_swarm' as const;
  public readonly pubkey;

  constructor(pubkey: PubkeyType | GroupPubkeyType) {
    super();
    this.pubkey = pubkey;
  }

  public build() {
    return {
      method: this.method,
      params: {
        pubkey: this.pubkey,
        params: {
          active_only: true,
          fields: {
            public_ip: true,
            storage_port: true,
            pubkey_x25519: true,
            pubkey_ed25519: true,
          },
        },
      },
    } as const;
  }

  public loggingId(): string {
    return `${this.method}`;
  }
}

export class NetworkTimeSubRequest extends SnodeAPISubRequest {
  public method = 'info' as const;

  public build() {
    return {
      method: this.method,
      params: {},
    } as const;
  }

  public loggingId(): string {
    return `${this.method}`;
  }
}

abstract class AbstractRevokeSubRequest extends SnodeAPISubRequest {
  public readonly groupPk: GroupPubkeyType;
  public readonly timestamp: number;
  public readonly revokeTokenHex: Array<string>;
  protected readonly adminSecretKey: Uint8Array;

  constructor({
    groupPk,
    timestamp,
    revokeTokenHex,
    secretKey,
  }: WithGroupPubkey & WithTimestamp & WithSecretKey & { revokeTokenHex: Array<string> }) {
    super();
    this.groupPk = groupPk;
    this.timestamp = timestamp;
    this.revokeTokenHex = revokeTokenHex;
    this.adminSecretKey = secretKey;
    if (this.revokeTokenHex.length === 0) {
      throw new Error('AbstractRevokeSubRequest needs at least one token to do a change');
    }
  }

  public async signWithAdminSecretKey() {
    if (!this.adminSecretKey) {
      throw new Error('we need an admin secretkey');
    }
    const tokensBytes = from_hex(this.revokeTokenHex.join(''));

    const prefix = new Uint8Array(StringUtils.encode(`${this.method}${this.timestamp}`, 'utf8'));
    const sigResult = await SnodeGroupSignature.signDataWithAdminSecret(
      concatUInt8Array(prefix, tokensBytes),
      { secretKey: this.adminSecretKey }
    );

    return sigResult.signature;
  }

  public loggingId(): string {
    return `${this.method}-${ed25519Str(this.groupPk)}`;
  }
}

export class SubaccountRevokeSubRequest extends AbstractRevokeSubRequest {
  public method = 'revoke_subaccount' as const;

  public async build() {
    const signature = await this.signWithAdminSecretKey();
    return {
      method: this.method,
      params: {
        pubkey: this.groupPk,
        signature,
        revoke: this.revokeTokenHex,
        timestamp: this.timestamp,
      },
    };
  }
}

export class SubaccountUnrevokeSubRequest extends AbstractRevokeSubRequest {
  public method = 'unrevoke_subaccount' as const;

  /**
   * For Revoke/unrevoke, this needs an admin signature
   */
  public async build() {
    const signature = await this.signWithAdminSecretKey();

    return {
      method: this.method,
      params: {
        pubkey: this.groupPk,
        signature,
        unrevoke: this.revokeTokenHex,
        timestamp: this.timestamp,
      },
    };
  }
}

/**
 * The getExpiriies request can currently only be used for our own pubkey as we use it to fetch
 * the expiries updated by another of our devices.
 */
export class GetExpiriesFromNodeSubRequest extends SnodeAPISubRequest {
  public method = 'get_expiries' as const;
  public readonly messageHashes: Array<string>;

  constructor(args: WithMessagesHashes) {
    super();
    this.messageHashes = args.messagesHashes;
    if (this.messageHashes.length === 0) {
      window.log.warn(`GetExpiriesFromNodeSubRequest given empty list of messageHashes`);
      throw new Error('GetExpiriesFromNodeSubRequest given empty list of messageHashes');
    }
  }
  /**
   * For Revoke/unrevoke, this needs an admin signature
   */
  public async build() {
    const timestamp = GetNetworkTime.now();

    const ourPubKey = UserUtils.getOurPubKeyStrFromCache();
    if (!ourPubKey) {
      throw new Error('[GetExpiriesFromNodeSubRequest] No pubkey found');
    }
    const signResult = await SnodeSignature.generateGetExpiriesOurSignature({
      timestamp,
      messageHashes: this.messageHashes,
    });

    if (!signResult) {
      throw new Error(
        `[GetExpiriesFromNodeSubRequest] SnodeSignature.generateUpdateExpirySignature returned an empty result ${this.messageHashes}`
      );
    }

    return {
      method: this.method,
      params: {
        pubkey: ourPubKey,
        pubkey_ed25519: signResult.pubkey_ed25519.toUpperCase(),
        signature: signResult.signature,
        messages: this.messageHashes,
        timestamp,
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-us`;
  }
}

// todo: to use where delete_all is currently manually called
export class DeleteAllFromUserNodeSubRequest extends SnodeAPISubRequest {
  public method = 'delete_all' as const;
  public readonly namespace = 'all'; // we can only delete_all for all namespaces currently, but the backend allows more

  public async build() {
    const signResult = await SnodeSignature.getSnodeSignatureParamsUs({
      method: this.method,
      namespace: this.namespace,
    });

    if (!signResult) {
      throw new Error(
        `[DeleteAllFromUserNodeSubRequest] SnodeSignature.getSnodeSignatureParamsUs returned an empty result`
      );
    }

    return {
      method: this.method,
      params: {
        pubkey: signResult.pubkey,
        pubkey_ed25519: signResult.pubkey_ed25519.toUpperCase(),
        signature: signResult.signature,
        timestamp: signResult.timestamp,
        namespace: this.namespace,
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${this.namespace}`;
  }
}

/**
 * Delete all the messages and not the config messages for that group 03.
 */
export class DeleteAllFromGroupMsgNodeSubRequest extends SnodeAPISubRequest {
  public method = 'delete_all' as const;
  public readonly namespace = SnodeNamespaces.ClosedGroupMessages;
  public readonly adminSecretKey: Uint8Array;
  public readonly groupPk: GroupPubkeyType;

  constructor(args: WithGroupPubkey & WithSecretKey) {
    super();
    this.groupPk = args.groupPk;
    this.adminSecretKey = args.secretKey;
    if (isEmpty(this.adminSecretKey)) {
      throw new Error('DeleteAllFromGroupMsgNodeSubRequest needs an adminSecretKey');
    }
  }

  public async build() {
    const signDetails = await SnodeGroupSignature.getSnodeGroupSignature({
      method: this.method,
      namespace: this.namespace,
      group: { authData: null, pubkeyHex: this.groupPk, secretKey: this.adminSecretKey },
    });

    if (!signDetails) {
      throw new Error(
        `[DeleteAllFromGroupMsgNodeSubRequest] SnodeSignature.getSnodeSignatureParamsUs returned an empty result`
      );
    }
    return {
      method: this.method,
      params: {
        ...signDetails,
        namespace: this.namespace,
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${ed25519Str(this.groupPk)}-${this.namespace}`;
  }
}

export class DeleteHashesFromUserNodeSubRequest extends SnodeAPISubRequest {
  public method = 'delete' as const;
  public readonly messageHashes: Array<string>;
  public readonly pubkey: PubkeyType;

  constructor(args: WithMessagesHashes) {
    super();
    this.messageHashes = args.messagesHashes;
    this.pubkey = UserUtils.getOurPubKeyStrFromCache();

    if (this.messageHashes.length === 0) {
      window.log.warn(`DeleteHashesFromUserNodeSubRequest given empty list of messageHashes`);
      throw new Error('DeleteHashesFromUserNodeSubRequest given empty list of messageHashes');
    }
  }

  public async build() {
    const signResult = await SnodeSignature.getSnodeSignatureByHashesParams({
      method: this.method,
      messagesHashes: this.messageHashes,
      pubkey: this.pubkey,
    });

    if (!signResult) {
      throw new Error(
        `[DeleteHashesFromUserNodeSubRequest] SnodeSignature.getSnodeSignatureParamsUs returned an empty result`
      );
    }

    return {
      method: this.method,
      params: {
        pubkey: signResult.pubkey,
        pubkey_ed25519: signResult.pubkey_ed25519,
        signature: signResult.signature,
        messages: signResult.messages,
        // timestamp is not needed for this one as the hashes can be deleted only once
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-us`;
  }
}

export class DeleteHashesFromGroupNodeSubRequest extends SnodeAPISubRequest {
  public method = 'delete' as const;
  public readonly messageHashes: Array<string>;
  public readonly pubkey: GroupPubkeyType;
  public readonly secretKey: Uint8Array;

  constructor(args: WithMessagesHashes & WithGroupPubkey & WithSecretKey) {
    super();
    this.messageHashes = args.messagesHashes;
    this.pubkey = args.groupPk;
    this.secretKey = args.secretKey;
    if (!this.secretKey || isEmpty(this.secretKey)) {
      throw new Error('DeleteHashesFromGroupNodeSubRequest needs a secretKey');
    }

    if (this.messageHashes.length === 0) {
      window.log.warn(
        `DeleteHashesFromGroupNodeSubRequest given empty list of messageHashes for ${ed25519Str(this.pubkey)}`
      );

      throw new Error('DeleteHashesFromGroupNodeSubRequest given empty list of messageHashes');
    }
  }

  public async build() {
    // Note: this request can only be made by an admin and will be denied otherwise, so we make the secretKey mandatory in the constructor.
    const signResult = await SnodeGroupSignature.getGroupSignatureByHashesParams({
      method: this.method,
      messagesHashes: this.messageHashes,
      groupPk: this.pubkey,
      group: { authData: null, pubkeyHex: this.pubkey, secretKey: this.secretKey },
    });

    return {
      method: this.method,
      params: {
        ...signResult,
        // pubkey_ed25519 is forbidden when doing the request for a group
        // timestamp is not needed for this one as the hashes can be deleted only once
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${ed25519Str(this.pubkey)}`;
  }
}

export class UpdateExpiryOnNodeUserSubRequest extends SnodeAPISubRequest {
  public method = 'expire' as const;
  public readonly messageHashes: Array<string>;
  public readonly expiryMs: number;
  public readonly shortenOrExtend: ShortenOrExtend;

  constructor(args: WithMessagesHashes & WithShortenOrExtend & { expiryMs: number }) {
    super();
    this.messageHashes = args.messagesHashes;
    this.expiryMs = args.expiryMs;
    this.shortenOrExtend = args.shortenOrExtend;

    if (this.messageHashes.length === 0) {
      window.log.warn(`UpdateExpiryOnNodeUserSubRequest given empty list of messageHashes`);

      throw new Error('UpdateExpiryOnNodeUserSubRequest given empty list of messageHashes');
    }
  }

  public async build() {
    const signResult = await SnodeSignature.generateUpdateExpiryOurSignature({
      shortenOrExtend: this.shortenOrExtend,
      messagesHashes: this.messageHashes,
      timestamp: this.expiryMs,
    });

    if (!signResult) {
      throw new Error(
        `[UpdateExpiryOnNodeUserSubRequest] SnodeSignature.getSnodeSignatureParamsUs returned an empty result`
      );
    }

    const shortenOrExtend =
      this.shortenOrExtend === 'extend'
        ? { extend: true }
        : this.shortenOrExtend === 'shorten'
          ? { shorten: true }
          : {};

    return {
      method: this.method,
      params: {
        pubkey: UserUtils.getOurPubKeyStrFromCache(),
        pubkey_ed25519: signResult.pubkey,
        signature: signResult.signature,
        messages: this.messageHashes,
        expiry: this.expiryMs,
        ...shortenOrExtend,
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-us`;
  }
}

export class UpdateExpiryOnNodeGroupSubRequest extends SnodeAPISubRequest {
  public method = 'expire' as const;
  public readonly messageHashes: Array<string>;
  public readonly expiryMs: number;
  public readonly shortenOrExtend: ShortenOrExtend;
  public readonly groupDetailsNeededForSignature: GroupDetailsNeededForSignature;

  constructor(
    args: WithMessagesHashes &
      WithShortenOrExtend & {
        expiryMs: number;
        groupDetailsNeededForSignature: GroupDetailsNeededForSignature;
      }
  ) {
    super();
    this.messageHashes = args.messagesHashes;
    this.expiryMs = args.expiryMs;
    this.shortenOrExtend = args.shortenOrExtend;
    this.groupDetailsNeededForSignature = args.groupDetailsNeededForSignature;

    if (this.messageHashes.length === 0) {
      window.log.warn(
        `UpdateExpiryOnNodeGroupSubRequest given empty list of messageHashes for ${ed25519Str(this.groupDetailsNeededForSignature.pubkeyHex)}`
      );

      throw new Error('UpdateExpiryOnNodeGroupSubRequest given empty list of messageHashes');
    }
  }

  public async build() {
    const signResult = await SnodeGroupSignature.generateUpdateExpiryGroupSignature({
      shortenOrExtend: this.shortenOrExtend,
      messagesHashes: this.messageHashes,
      expiryMs: this.expiryMs,
      group: this.groupDetailsNeededForSignature,
    });

    if (!signResult) {
      throw new Error(
        `[UpdateExpiryOnNodeUserSubRequest] SnodeSignature.getSnodeSignatureParamsUs returned an empty result`
      );
    }

    const shortenOrExtend =
      this.shortenOrExtend === 'extend'
        ? { extends: true }
        : this.shortenOrExtend === 'shorten'
          ? { shorten: true }
          : {};

    return {
      method: this.method,
      params: {
        messages: this.messageHashes,
        ...shortenOrExtend,
        ...signResult,

        // pubkey_ed25519 is forbidden for the group one
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${ed25519Str(this.groupDetailsNeededForSignature.pubkeyHex)}`;
  }
}

type WithCreatedAtNetworkTimestamp = { createdAtNetworkTimestamp: number };

export class StoreGroupMessageSubRequest extends SnodeAPISubRequest {
  public method = 'store' as const;
  public readonly namespace = SnodeNamespaces.ClosedGroupMessages;
  public readonly destination: GroupPubkeyType;
  public readonly ttlMs: number;
  public readonly encryptedData: Uint8Array;
  public readonly dbMessageIdentifier: string | null;
  public readonly secretKey: Uint8Array | null;
  public readonly authData: Uint8Array | null;
  public readonly createdAtNetworkTimestamp: number;

  constructor(
    args: WithGroupPubkey &
      WithCreatedAtNetworkTimestamp & {
        ttlMs: number;
        encryptedData: Uint8Array;
        dbMessageIdentifier: string | null;
        authData: Uint8Array | null;
        secretKey: Uint8Array | null;
      }
  ) {
    super();
    this.destination = args.groupPk;
    this.ttlMs = args.ttlMs;
    this.encryptedData = args.encryptedData;
    this.dbMessageIdentifier = args.dbMessageIdentifier;
    this.authData = args.authData;
    this.secretKey = args.secretKey;
    this.createdAtNetworkTimestamp = args.createdAtNetworkTimestamp;

    if (isEmpty(this.encryptedData)) {
      throw new Error('this.encryptedData cannot be empty');
    }
    if (!PubKey.is03Pubkey(this.destination)) {
      throw new Error('StoreGroupMessageSubRequest: groupconfig namespace required a 03 pubkey');
    }
    if (isEmpty(this.secretKey) && isEmpty(this.authData)) {
      throw new Error('StoreGroupMessageSubRequest needs either authData or secretKey to be set');
    }
    if (SnodeNamespace.isGroupConfigNamespace(this.namespace) && isEmpty(this.secretKey)) {
      throw new Error(
        `StoreGroupMessageSubRequest: groupconfig namespace [${this.namespace}] requires an adminSecretKey`
      );
    }
  }

  public async build(): Promise<{
    method: 'store';
    params: StoreOnNodeNormalParams;
  }> {
    const encryptedDataBase64 = ByteBuffer.wrap(this.encryptedData).toString('base64');

    // this will either sign with our admin key or with the subaccount key if the admin one isn't there
    const signDetails = await SnodeGroupSignature.getSnodeGroupSignature({
      method: this.method,
      namespace: this.namespace,
      group: { authData: this.authData, pubkeyHex: this.destination, secretKey: this.secretKey },
    });

    if (!signDetails) {
      throw new Error(`[${this.loggingId()}] sign details is empty result`);
    }

    return {
      method: this.method,
      params: {
        namespace: this.namespace,
        ttl: this.ttlMs,
        data: encryptedDataBase64,
        ...signDetails,
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${ed25519Str(this.destination)}-${SnodeNamespace.toRole(
      this.namespace
    )}`;
  }
}

abstract class StoreGroupConfigSubRequest<
  T extends SnodeNamespacesGroupConfig | SnodeNamespaces.ClosedGroupRevokedRetrievableMessages,
> extends SnodeAPISubRequest {
  public method = 'store' as const;
  public readonly namespace: T;
  public readonly destination: GroupPubkeyType;
  public readonly ttlMs: number;
  public readonly encryptedData: Uint8Array;
  // this is mandatory for a group config store, if it is null, we throw
  public readonly secretKey: Uint8Array | null;

  constructor(
    args: WithGroupPubkey & {
      namespace: T;
      encryptedData: Uint8Array;
      secretKey: Uint8Array | null;
    }
  ) {
    super();
    this.namespace = args.namespace;
    this.destination = args.groupPk;
    this.ttlMs = TTL_DEFAULT.CONFIG_MESSAGE;
    this.encryptedData = args.encryptedData;
    this.secretKey = args.secretKey;

    if (isEmpty(this.encryptedData)) {
      throw new Error('this.encryptedData cannot be empty');
    }
    if (!PubKey.is03Pubkey(this.destination)) {
      throw new Error('StoreGroupConfigSubRequest: groupconfig namespace required a 03 pubkey');
    }
    if (isEmpty(this.secretKey)) {
      throw new Error('StoreGroupConfigSubRequest needs secretKey to be set');
    }
  }

  public async build(): Promise<{
    method: 'store';
    params: StoreOnNodeNormalParams;
  }> {
    const encryptedDataBase64 = ByteBuffer.wrap(this.encryptedData).toString('base64');

    // this will either sign with our admin key or with the subaccount key if the admin one isn't there
    const signDetails = await SnodeGroupSignature.getSnodeGroupSignature({
      method: this.method,
      namespace: this.namespace,
      group: { authData: null, pubkeyHex: this.destination, secretKey: this.secretKey },
    });

    if (!signDetails) {
      throw new Error(`[${this.loggingId()}] sign details is empty result`);
    }

    return {
      method: this.method,
      params: {
        namespace: this.namespace,
        ttl: this.ttlMs,
        data: encryptedDataBase64,
        ...signDetails,
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${ed25519Str(this.destination)}-${SnodeNamespace.toRole(
      this.namespace
    )}`;
  }
}

export class StoreGroupInfoSubRequest extends StoreGroupConfigSubRequest<SnodeNamespaces.ClosedGroupInfo> {
  constructor(
    args: Omit<ConstructorParameters<typeof StoreGroupConfigSubRequest>[0], 'namespace'>
  ) {
    super({ ...args, namespace: SnodeNamespaces.ClosedGroupInfo });
  }
}
export class StoreGroupMembersSubRequest extends StoreGroupConfigSubRequest<SnodeNamespaces.ClosedGroupMembers> {
  constructor(
    args: Omit<ConstructorParameters<typeof StoreGroupConfigSubRequest>[0], 'namespace'>
  ) {
    super({ ...args, namespace: SnodeNamespaces.ClosedGroupMembers });
  }
}
export class StoreGroupKeysSubRequest extends StoreGroupConfigSubRequest<SnodeNamespaces.ClosedGroupKeys> {
  constructor(
    args: Omit<ConstructorParameters<typeof StoreGroupConfigSubRequest>[0], 'namespace'>
  ) {
    super({ ...args, namespace: SnodeNamespaces.ClosedGroupKeys });
  }
}

export class StoreGroupRevokedRetrievableSubRequest extends StoreGroupConfigSubRequest<SnodeNamespaces.ClosedGroupRevokedRetrievableMessages> {
  constructor(
    args: Omit<ConstructorParameters<typeof StoreGroupConfigSubRequest>[0], 'namespace'>
  ) {
    super({ ...args, namespace: SnodeNamespaces.ClosedGroupRevokedRetrievableMessages });
  }
}

export class StoreUserConfigSubRequest extends SnodeAPISubRequest {
  public method = 'store' as const;
  public readonly namespace: SnodeNamespacesUserConfig;
  public readonly ttlMs: number;
  public readonly encryptedData: Uint8Array;
  public readonly destination: PubkeyType;

  constructor(args: {
    namespace: SnodeNamespacesUserConfig;
    ttlMs: number;
    encryptedData: Uint8Array;
  }) {
    super();
    this.namespace = args.namespace;
    this.ttlMs = args.ttlMs;
    this.encryptedData = args.encryptedData;
    this.destination = UserUtils.getOurPubKeyStrFromCache();

    if (isEmpty(this.encryptedData)) {
      throw new Error('this.encryptedData cannot be empty');
    }

    if (isEmpty(this.destination)) {
      throw new Error('this.destination cannot be empty');
    }
  }

  public async build(): Promise<{
    method: 'store';
    params: StoreOnNodeNormalParams;
  }> {
    const encryptedDataBase64 = ByteBuffer.wrap(this.encryptedData).toString('base64');
    const ourPrivKey = (await UserUtils.getUserED25519KeyPairBytes())?.privKeyBytes;
    if (!ourPrivKey) {
      throw new Error('getUserED25519KeyPairBytes is empty');
    }

    const signDetails = await SnodeSignature.getSnodeSignatureParamsUs({
      method: this.method,
      namespace: this.namespace,
    });

    if (!signDetails) {
      throw new Error(`[StoreUserConfigSubRequest] signing returned an empty result`);
    }

    return {
      method: this.method,
      params: {
        namespace: this.namespace,
        ttl: this.ttlMs,
        data: encryptedDataBase64,
        ...signDetails,
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${ed25519Str(this.destination)}-${SnodeNamespace.toRole(
      this.namespace
    )}`;
  }
}

/**
 * A request to send a message to the default namespace of another user (namespace 0 is not authenticated)
 */
export class StoreUserMessageSubRequest extends SnodeAPISubRequest {
  public method = 'store' as const;
  public readonly ttlMs: number;
  public readonly encryptedData: Uint8Array;
  public readonly namespace = SnodeNamespaces.Default;
  public readonly destination: PubkeyType;
  public readonly dbMessageIdentifier: string | null;
  public readonly createdAtNetworkTimestamp: number;

  public readonly plainTextBuffer: Uint8Array | null;

  constructor(
    args: WithCreatedAtNetworkTimestamp & {
      ttlMs: number;
      encryptedData: Uint8Array;
      destination: PubkeyType;
      dbMessageIdentifier: string | null;
      /**
       * When we send a message to a 1o1 recipient, we then need to send the same message to our own swarm as a synced message.
       * To forward that message, we need the original message data, which is the plainTextBuffer field here.
       */
      plainTextBuffer: Uint8Array | null;
    }
  ) {
    super();
    this.ttlMs = args.ttlMs;
    this.destination = args.destination;
    this.encryptedData = args.encryptedData;
    this.plainTextBuffer = args.plainTextBuffer;
    this.dbMessageIdentifier = args.dbMessageIdentifier;
    this.createdAtNetworkTimestamp = args.createdAtNetworkTimestamp;

    if (isEmpty(this.encryptedData)) {
      throw new Error('this.encryptedData cannot be empty');
    }
    if (this.plainTextBuffer && !this.plainTextBuffer.length) {
      throw new Error('this.plainTextBuffer can be either null or non-empty');
    }
  }

  public async build(): Promise<{
    method: 'store';
    params: StoreOnNodeNormalParams;
  }> {
    const encryptedDataBase64 = ByteBuffer.wrap(this.encryptedData).toString('base64');

    return {
      method: this.method,
      params: {
        pubkey: this.destination,
        timestamp: GetNetworkTime.now(),
        namespace: this.namespace,
        ttl: this.ttlMs,
        data: encryptedDataBase64,
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${ed25519Str(this.destination)}-${SnodeNamespace.toRole(
      this.namespace
    )}`;
  }
}

/**
 * A request to send a message to the default namespace of another user (namespace 0 is not authenticated)
 *
 * TODO: this is almost an exact match of `StoreUserMessageSubRequest` due to be removed once we get rid of legacy groups.
 */
export class StoreLegacyGroupMessageSubRequest extends SnodeAPISubRequest {
  public method = 'store' as const;
  public readonly ttlMs: number;
  public readonly encryptedData: Uint8Array;
  public readonly namespace = SnodeNamespaces.LegacyClosedGroup;
  public readonly destination: PubkeyType;
  public readonly dbMessageIdentifier: string | null;
  public readonly createdAtNetworkTimestamp: number;

  constructor(
    args: WithCreatedAtNetworkTimestamp & {
      ttlMs: number;
      encryptedData: Uint8Array;
      destination: PubkeyType;
      dbMessageIdentifier: string | null;
    }
  ) {
    super();
    this.ttlMs = args.ttlMs;
    this.destination = args.destination;
    this.encryptedData = args.encryptedData;
    this.dbMessageIdentifier = args.dbMessageIdentifier;
    this.createdAtNetworkTimestamp = args.createdAtNetworkTimestamp;

    if (isEmpty(this.encryptedData)) {
      throw new Error('this.encryptedData cannot be empty');
    }
  }

  public async build(): Promise<{
    method: 'store';
    params: StoreOnNodeNormalParams;
  }> {
    const encryptedDataBase64 = ByteBuffer.wrap(this.encryptedData).toString('base64');

    return {
      method: this.method,
      params: {
        // no signature required for a legacy group retrieve/store of message to namespace -10
        pubkey: this.destination,
        timestamp: GetNetworkTime.now(),
        namespace: this.namespace,
        ttl: this.ttlMs,
        data: encryptedDataBase64,
      },
    };
  }

  public loggingId(): string {
    return `${this.method}-${ed25519Str(this.destination)}-${SnodeNamespace.toRole(
      this.namespace
    )}`;
  }
}

/**
 * When sending group libsession push(), we can also include extra messages to store (update messages, supplemental keys, etc)
 */
export type StoreGroupExtraData = {
  networkTimestamp: number;
  data: Uint8Array;
  ttl: number;
  pubkey: GroupPubkeyType;
  dbMessageIdentifier: string | null;
} & { namespace: SnodeNamespacesGroupConfig | SnodeNamespaces.ClosedGroupMessages };

/**
 * STORE SUBREQUESTS
 */
type StoreOnNodeNormalParams = {
  pubkey: string;
  ttl: number;
  timestamp: number;
  data: string;
  namespace: number;
  signature?: string;
  pubkey_ed25519?: string;
};

type StoreOnNodeSubAccountParams = Pick<
  StoreOnNodeNormalParams,
  'data' | 'namespace' | 'ttl' | 'timestamp'
> &
  WithSignature & {
    pubkey: GroupPubkeyType;
    subaccount: string;
    subaccount_sig: string;
    namespace: SnodeNamespaces.ClosedGroupMessages; // this can only be this one, subaccounts holder can not post to something else atm
    // signature is mandatory for subaccount
  };

type StoreOnNodeParams = StoreOnNodeNormalParams | StoreOnNodeSubAccountParams;

export type MethodBatchType = 'batch' | 'sequence';

// Until the next storage server release is released, we need to have at least 2 hashes in the list for the `get_expiries` AND for the `update_expiries`
export const fakeHash = '///////////////////////////////////////////';

export type RawSnodeSubRequests =
  | RetrieveLegacyClosedGroupSubRequest
  | RetrieveUserSubRequest
  | RetrieveGroupSubRequest
  | StoreGroupInfoSubRequest
  | StoreGroupMembersSubRequest
  | StoreGroupKeysSubRequest
  | StoreGroupMessageSubRequest
  | StoreGroupRevokedRetrievableSubRequest
  | StoreUserConfigSubRequest
  | SwarmForSubRequest
  | OnsResolveSubRequest
  | GetServiceNodesSubRequest
  | StoreUserMessageSubRequest
  | StoreLegacyGroupMessageSubRequest
  | NetworkTimeSubRequest
  | DeleteHashesFromGroupNodeSubRequest
  | DeleteHashesFromUserNodeSubRequest
  | DeleteAllFromUserNodeSubRequest
  | UpdateExpiryOnNodeUserSubRequest
  | UpdateExpiryOnNodeGroupSubRequest
  | SubaccountRevokeSubRequest
  | SubaccountUnrevokeSubRequest
  | GetExpiriesFromNodeSubRequest
  | DeleteAllFromGroupMsgNodeSubRequest;

export type BuiltSnodeSubRequests = AwaitedReturn<RawSnodeSubRequests['build']>;

export function builtRequestToLoggingId(request: BuiltSnodeSubRequests): string {
  const { method, params } = request;
  switch (method) {
    case 'info':
    case 'oxend_request':
      return `${method}`;

    case 'delete':
    case 'expire':
    case 'get_expiries':
    case 'get_swarm':
    case 'revoke_subaccount':
    case 'unrevoke_subaccount': {
      const isUs = UserUtils.isUsFromCache(params.pubkey);
      return `${method}-${isUs ? 'us' : ed25519Str(params.pubkey)}`;
    }
    case 'delete_all': {
      const isUs = UserUtils.isUsFromCache(params.pubkey);
      return `${method}-${isUs ? 'us' : ed25519Str(params.pubkey)}-${
        isString(params.namespace) ? params.namespace : SnodeNamespace.toRole(params.namespace)
      }}`;
    }

    case 'retrieve':
    case 'store': {
      const isUs = UserUtils.isUsFromCache(params.pubkey);
      return `${method}-${isUs ? 'us' : ed25519Str(params.pubkey)}-${SnodeNamespace.toRole(
        params.namespace
      )}`;
    }
    default:
      assertUnreachable(method, 'should be unreachable case');
      throw new Error('should be unreachable case');
  }
}

// eslint-disable-next-line @typescript-eslint/array-type
type NonEmptyArray<T> = [T, ...T[]];

export type BatchResultEntry = {
  code: number;
  body: Record<string, any>;
};

export type NotEmptyArrayOfBatchResults = NonEmptyArray<BatchResultEntry>;

export const MAX_SUBREQUESTS_COUNT = 20;

export type BatchStoreWithExtraParams =
  | StoreOnNodeParams
  | DeleteHashesFromGroupNodeSubRequest
  | DeleteHashesFromUserNodeSubRequest
  | SubaccountRevokeSubRequest
  | SubaccountUnrevokeSubRequest;
