import * as crypto from 'crypto';
import { GroupPubkeyType, PubkeyType, UserGroupsWrapperNode } from 'libsession_util_nodejs';
import { KeyPair, to_hex } from 'libsodium-wrappers-sumo';
import _ from 'lodash';
import { Snode } from '../../../data/data';
import { getSodiumNode } from '../../../node/sodiumNode';
import { ECKeyPair } from '../../../receiver/keypairs';
import { SnodePool } from '../../../session/apis/snode_api/snodePool';
import { PubKey } from '../../../session/types';
import { ByteKeyPair } from '../../../session/utils/User';
import { stubData } from './stubbing';

export function generateFakePubKey(): PubKey {
  // Generates a mock pubkey for testing
  const numBytes = PubKey.PUBKEY_LEN / 2 - 1;
  const hexBuffer = crypto.randomBytes(numBytes).toString('hex');
  const pubkeyString = `05${hexBuffer}`;

  return new PubKey(pubkeyString);
}

export function generateFakePubKeyStr(): PubkeyType {
  // Generates a mock pubkey for testing
  const numBytes = PubKey.PUBKEY_LEN / 2 - 1;
  const hexBuffer = crypto.randomBytes(numBytes).toString('hex');
  const pubkeyString: PubkeyType = `05${hexBuffer}`;

  return pubkeyString;
}

export type TestUserKeyPairs = {
  x25519KeyPair: {
    pubkeyHex: PubkeyType;
    pubKey: Uint8Array;
    privKey: Uint8Array;
  };
  ed25519KeyPair: KeyPair & ByteKeyPair;
};

export async function generateUserKeyPairs(): Promise<TestUserKeyPairs> {
  const sodium = await getSodiumNode();
  const ed25519KeyPair = sodium.crypto_sign_seed_keypair(
    sodium.randombytes_buf(sodium.crypto_sign_SEEDBYTES)
  );
  const x25519PublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(ed25519KeyPair.publicKey);
  // prepend version byte (coming from `processKeys(raw_keys)`)
  const origPub = new Uint8Array(x25519PublicKey);
  const prependedX25519PublicKey = new Uint8Array(33);
  prependedX25519PublicKey.set(origPub, 1);
  prependedX25519PublicKey[0] = 5;
  const x25519SecretKey = sodium.crypto_sign_ed25519_sk_to_curve25519(ed25519KeyPair.privateKey);

  // prepend with 05 the public key
  const userKeys = {
    x25519KeyPair: {
      pubkeyHex: to_hex(prependedX25519PublicKey) as PubkeyType,
      pubKey: prependedX25519PublicKey,
      privKey: x25519SecretKey,
    },
    ed25519KeyPair: {
      ...ed25519KeyPair,
      pubKeyBytes: ed25519KeyPair.publicKey,
      privKeyBytes: ed25519KeyPair.privateKey,
    },
  };

  return userKeys;
}

export async function generateGroupV2(privateEd25519: Uint8Array) {
  const groupWrapper = new UserGroupsWrapperNode(privateEd25519, null);
  return groupWrapper.createGroup();
}

export function generateFakeClosedGroupV2PkStr(): GroupPubkeyType {
  // Generates a mock pubkey for testing
  const numBytes = PubKey.PUBKEY_LEN / 2 - 1;
  const hexBuffer = crypto.randomBytes(numBytes).toString('hex');
  const pubkeyString: GroupPubkeyType = `03${hexBuffer}`;

  return pubkeyString;
}

export function generateFakeECKeyPair(): ECKeyPair {
  const pubkey = generateFakePubKey().toArray();
  const privKey = new Uint8Array(crypto.randomBytes(64));
  return new ECKeyPair(pubkey, privKey);
}

export function generateFakePubKeys(amount: number): Array<PubKey> {
  const numPubKeys = amount > 0 ? Math.floor(amount) : 0;

  return new Array(numPubKeys).fill(0).map(() => generateFakePubKey());
}

export function generateFakeSwarmFor(): Array<string> {
  return generateFakePubKeys(6).map(m => m.key);
}

export function generateFakeSnode(): Snode {
  return {
    ip: `136.243.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    port: 22116,
    pubkey_x25519: generateFakePubKeyStr(),
    pubkey_ed25519: generateFakePubKeyStr(),
  };
}

export function generateFakeSnodeWithEdKey(ed25519Pubkey: string): Snode {
  return {
    ip: `136.243.${Math.random() * 255}.${Math.random() * 255}`,
    port: 22116,
    pubkey_x25519: generateFakePubKeyStr(),
    pubkey_ed25519: ed25519Pubkey,
  };
}

export function generateFakeSnodes(amount: number): Array<Snode> {
  const ar: Array<Snode> = _.times(amount, generateFakeSnode);
  return ar;
}

/**
 * this function can be used to setup unit test which relies on fetching a snodepool
 */
export function setupTestWithSending() {
  const snodes = generateFakeSnodes(20);
  const swarm = snodes.slice(0, 6);
  SnodePool.TEST_resetState(snodes);

  stubData('getSwarmNodesForPubkey').resolves(swarm.map(m => m.pubkey_ed25519));
  return { snodes, swarm };
}
