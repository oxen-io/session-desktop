import { isBoolean } from 'lodash';
import { DEFAULT_RECENT_REACTS } from '../session/constants'; // ok


export async function setLocalPubKey(pubkey: string) {
  await window.Storage.put('number_id', `${pubkey}.1`);
}

export function getOurPubKeyStrFromStorage() {
  const numberId = window.Storage.get('number_id') as string | undefined;
  if (numberId === undefined) {
    return undefined;
  }
  return numberId.split('.')[0];
}

export function isSignInByLinking() {
  const isByLinking = window.Storage.get('is_sign_in_by_linking');
  if (isByLinking === undefined) {
    return false;
  }
  return isByLinking;
}

export async function setSignInByLinking(isLinking: boolean) {
  await window.Storage.put('is_sign_in_by_linking', isLinking);
}

export function isSignWithRecoveryPhrase() {
  const isRecoveryPhraseUsed = window.Storage.get('is_sign_in_recovery_phrase');
  if (isRecoveryPhraseUsed === undefined) {
    return false;
  }
  return isRecoveryPhraseUsed;
}

export async function setSignWithRecoveryPhrase(isRecoveryPhraseUsed: boolean) {
  await window.Storage.put('is_sign_in_recovery_phrase', isRecoveryPhraseUsed);
}

export function getLastProfileUpdateTimestamp() {
  return window.Storage.get('last_profile_update_timestamp');
}

export function getCurrentRecoveryPhrase() {
  return window.Storage.get('mnemonic') as string;
}

export async function saveRecoveryPhrase(mnemonic: string) {
  return window.Storage.put('mnemonic', mnemonic);
}

export function getRecentReactions(): Array<string> {
  const reactions = window.Storage.get('recent_reactions') as string;
  if (reactions) {
    return reactions.split(' ');
  }
  return DEFAULT_RECENT_REACTS;
}

export async function saveRecentReations(reactions: Array<string>) {
  return window.Storage.put('recent_reactions', reactions.join(' '));
}

export function getBoolOrFalse(settingsKey: string): boolean {
  const got = window.Storage.get(settingsKey, false);
  if (isBoolean(got)) {
    return got;
  }
  return false;
}
