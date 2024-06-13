import { EncryptionDomain } from 'libsession_util_nodejs';
import { MultiEncryptWrapperActions } from '../../../webworker/workers/browser/libsession_worker_interface';

const allKnownEncryptionDomains: Array<EncryptionDomain> = ['SessionGroupKickedMessage'];

/**
 * Try to decrypt the content with any type of encryption domains we know.
 * Does not throw, will return null if we couldn't decrypt it successfuly.
 */
async function multiDecryptAnyEncryptionDomain({
  encoded,
  senderEd25519Pubkey,
  userEd25519SecretKey,
}: {
  encoded: Uint8Array;
  senderEd25519Pubkey: Uint8Array;
  userEd25519SecretKey: Uint8Array;
}) {
  for (let index = 0; index < allKnownEncryptionDomains.length; index++) {
    const domain = allKnownEncryptionDomains[index];
    try {
      // eslint-disable-next-line no-await-in-loop
      const decrypted = await MultiEncryptWrapperActions.multiDecryptEd25519({
        encoded,
        senderEd25519Pubkey,
        userEd25519SecretKey,
        domain,
      });
      return { decrypted, domain };
    } catch (e) {
      window.log.info(
        `multiDecryptAnyEncryptionDomain: failed to decrypt message with encryption domain: ${domain}`
      );
    }
  }
  window.log.info(`multiDecryptAnyEncryptionDomain: failed to decrypt message entirely`);
  return null;
}

export const MultiEncryptUtils = {
  multiDecryptAnyEncryptionDomain,
};
