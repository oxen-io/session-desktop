import { EncryptionDomain, GroupPubkeyType, PubkeyType } from 'libsession_util_nodejs';
import { isNumber, toNumber } from 'lodash';
import { LibSodiumWrappers } from '../../session/crypto';
import { PubKey } from '../../session/types';
import { DecryptionFailed, InvalidMessage } from '../../session/utils/errors';
import { assertUnreachable } from '../../types/sqlSharedTypes';
import { WithLibSodiuMWrappers } from '../../session/types/with';
import {
  MetaGroupWrapperActions,
  UserGroupsWrapperActions,
} from '../../webworker/workers/browser/libsession_worker_interface';
import { ConvoHub } from '../../session/conversations';

/**
 * Logic for handling the `groupKicked` `LibSessionMessage`, this message should only be processed if it was
 * sent after the user joined the group (while unlikely, it's possible to receive this message when re-joining a group after
 * previously being kicked in which case we don't want to delete the data).
 */
async function handleLibSessionKickedMessage({
  decrypted,
  sodium,
  ourPk,
  groupPk,
}: {
  decrypted: Uint8Array;
  sodium: LibSodiumWrappers;
  ourPk: PubkeyType;
  groupPk: GroupPubkeyType;
}) {
  const pubkeyBytesCount = PubKey.PUBKEY_BYTE_COUNT_NO_PREFIX;
  if (decrypted.length <= pubkeyBytesCount) {
    throw new DecryptionFailed('DecryptionFailed for handleLibSessionKickedMessage');
  }
  // pubkey without prefix should be at the start, and current_gen as a string the rest of the content.
  const pubkeyEmbedded = decrypted.slice(0, pubkeyBytesCount);
  const currentGenStr = sodium.to_string(decrypted.slice(pubkeyBytesCount));
  const currentGenEmbedded = toNumber(currentGenStr);

  if (!isNumber(currentGenEmbedded)) {
    throw new InvalidMessage('currentGenEmbedded not a number');
  }
  const pubkeyEmbeddedHex = sodium.to_hex(pubkeyEmbedded);
  if (ourPk.slice(2) !== pubkeyEmbeddedHex) {
    throw new InvalidMessage('embedded pubkey does not match current user pubkey');
  }

  const currentGenFromWrapper = await MetaGroupWrapperActions.keyGetCurrentGen(groupPk);
  if (currentGenEmbedded < currentGenFromWrapper) {
    throw new InvalidMessage('currentgen in wrapper is higher than the one in the message ');
  }
  const inviteWasPending =
    (await UserGroupsWrapperActions.getGroup(groupPk))?.invitePending || false;
  await ConvoHub.use().deleteGroup(groupPk, {
    sendLeaveMessage: false,
    fromSyncMessage: false,
    emptyGroupButKeepAsKicked: !inviteWasPending,
    deleteAllMessagesOnSwarm: false,
    forceDestroyForAllMembers: false,
  });
}

async function handleLibSessionMessage(
  opts: {
    decrypted: Uint8Array;
    domain: EncryptionDomain;
    ourPk: PubkeyType;
    groupPk: GroupPubkeyType;
  } & WithLibSodiuMWrappers
) {
  switch (opts.domain) {
    case 'SessionGroupKickedMessage':
      await handleLibSessionKickedMessage(opts);
      return;

    default:
      assertUnreachable(
        opts.domain,
        `handleLibSessionMessage unhandled case for domain: ${opts.domain}`
      );
      break;
  }
}

export const LibsessionMessageHandler = {
  handleLibSessionMessage,
};
