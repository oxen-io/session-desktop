import { EnvelopePlus } from './types';
import { handleDataMessage, handleDataMessageBatch } from './dataMessage';

import { removeFromCache, updateCache } from './cache';
import { SignalService } from '../protobuf';
import * as Lodash from 'lodash';
import { PubKey } from '../session/types';

import { BlockedNumberController } from '../util/blockedNumberController';
import { GroupUtils, UserUtils } from '../session/utils';
import { fromHexToArray, toHex } from '../session/utils/String';
import { concatUInt8Array, getSodium } from '../session/crypto';
import { getConversationController } from '../session/conversations';
import { getAllEncryptionKeyPairsForGroup } from '../../ts/data/data';
import { ECKeyPair } from './keypairs';
import { handleConfigurationMessage } from './configMessage';
import { ConversationTypeEnum } from '../models/conversation';
import { removeMessagePadding } from '../session/crypto/BufferPadding';

export async function handleContentMessageBatch(envelopes: Array<EnvelopePlus>) {

  console.count(`handleContentMessageBatch length: ${envelopes.length} count: `);


  const plaintexts: Array<ArrayBuffer> = [];

  for (let index = 0; index < envelopes.length; index++) {
    const envelope = envelopes[index];

    try {
      const plaintext = await decrypt(envelope, envelope.content);

      if (!plaintext) {
        // window?.log?.warn('handleContentMessage: plaintext was falsey');
        // return;
        continue;
      } else if (plaintext instanceof ArrayBuffer && plaintext.byteLength === 0) {
        // is array but empty
        continue;
      }
      plaintexts.push(plaintext);
    } catch (e) {
      window?.log?.warn(e);
      // return;
      continue;
    }
  }

  await innerHandleContentMessageBatch(envelopes, plaintexts);
}

export async function handleContentMessage(envelope: EnvelopePlus) {
  try {
    const plaintext = await decrypt(envelope, envelope.content);

    if (!plaintext) {
      // window?.log?.warn('handleContentMessage: plaintext was falsey');
      return;
    } else if (plaintext instanceof ArrayBuffer && plaintext.byteLength === 0) {
      return;
    }
    await innerHandleContentMessage(envelope, plaintext);
  } catch (e) {
    window?.log?.warn(e);
  }
}

async function decryptForClosedGroup(envelope: EnvelopePlus, ciphertext: ArrayBuffer) {
  // case .closedGroupCiphertext: for ios
  window?.log?.info('received closed group message');
  try {
    const hexEncodedGroupPublicKey = envelope.source;
    if (!GroupUtils.isMediumGroup(PubKey.cast(hexEncodedGroupPublicKey))) {
      window?.log?.warn('received medium group message but not for an existing medium group');
      throw new Error('Invalid group public key'); // invalidGroupPublicKey
    }
    const encryptionKeyPairs = await getAllEncryptionKeyPairsForGroup(hexEncodedGroupPublicKey);
    const encryptionKeyPairsCount = encryptionKeyPairs?.length;
    if (!encryptionKeyPairs?.length) {
      throw new Error(`No group keypairs for group ${hexEncodedGroupPublicKey}`); // noGroupKeyPair
    }
    // Loop through all known group key pairs in reverse order (i.e. try the latest key pair first (which'll more than
    // likely be the one we want) but try older ones in case that didn't work)
    let decryptedContent: ArrayBuffer | undefined;
    let keyIndex = 0;

    // If an error happens in here, we catch it in the inner try-catch
    // When the loop is done, we check if the decryption is a success;
    // If not, we trigger a new Error which will trigger in the outer try-catch
    do {
      try {
        const hexEncryptionKeyPair = encryptionKeyPairs.pop();

        if (!hexEncryptionKeyPair) {
          throw new Error('No more encryption keypairs to try for message.');
        }
        const encryptionKeyPair = ECKeyPair.fromHexKeyPair(hexEncryptionKeyPair);

        decryptedContent = await decryptWithSessionProtocol(
          envelope,
          ciphertext,
          encryptionKeyPair,
          true
        );
        if (decryptedContent?.byteLength) {
          break;
        }
        keyIndex++;
      } catch (e) {
        window?.log?.info(
          `Failed to decrypt closed group with key index ${keyIndex}. We have ${encryptionKeyPairs.length} keys to try left.`
        );
      }
    } while (encryptionKeyPairs.length > 0);

    if (!decryptedContent?.byteLength) {
      throw new Error(
        `Could not decrypt message for closed group with any of the ${encryptionKeyPairsCount} keypairs.`
      );
    }
    if (keyIndex !== 0) {
      window?.log?.warn(
        'Decrypted a closed group message with not the latest encryptionkeypair we have'
      );
    }
    window?.log?.info('ClosedGroup Message decrypted successfully with keyIndex:', keyIndex);

    return removeMessagePadding(decryptedContent);
  } catch (e) {
    /**
     * If an error happened during the decoding,
     * we trigger a request to get the latest EncryptionKeyPair for this medium group.
     * Indeed, we might not have the latest one used by someone else, or not have any keypairs for this group.
     *
     */

    window?.log?.warn('decryptWithSessionProtocol for medium group message throw:', e);
    const groupPubKey = PubKey.cast(envelope.source);

    // IMPORTANT do not remove the message from the cache just yet.
    // We will try to decrypt it once we get the encryption keypair.
    // for that to work, we need to throw an error just like here.
    throw new Error(
      `Waiting for an encryption keypair to be received for group ${groupPubKey.key}`
    );

    return null;
  }
}

/**
 * This function can be called to decrypt a keypair wrapper for a closed group update
 * or a message sent to a closed group.
 *
 * We do not unpad the result here, as in the case of the keypair wrapper, there is not padding.
 * Instead, it is the called who needs to removeMessagePadding() the content.
 */
export async function decryptWithSessionProtocol(
  envelope: EnvelopePlus,
  ciphertextObj: ArrayBuffer,
  x25519KeyPair: ECKeyPair,
  isClosedGroup?: boolean
): Promise<ArrayBuffer> {
  const recipientX25519PrivateKey = x25519KeyPair.privateKeyData;
  const hex = toHex(new Uint8Array(x25519KeyPair.publicKeyData));

  const recipientX25519PublicKey = PubKey.remove05PrefixIfNeeded(hex);

  const sodium = await getSodium();
  const signatureSize = sodium.crypto_sign_BYTES;
  const ed25519PublicKeySize = sodium.crypto_sign_PUBLICKEYBYTES;

  // 1. ) Decrypt the message
  const plaintextWithMetadata = sodium.crypto_box_seal_open(
    new Uint8Array(ciphertextObj),
    fromHexToArray(recipientX25519PublicKey),
    new Uint8Array(recipientX25519PrivateKey)
  );
  if (plaintextWithMetadata.byteLength <= signatureSize + ed25519PublicKeySize) {
    throw new Error('Decryption failed.'); // throw Error.decryptionFailed;
  }

  // 2. ) Get the message parts
  const signatureStart = plaintextWithMetadata.byteLength - signatureSize;
  const signature = plaintextWithMetadata.subarray(signatureStart);
  const pubkeyStart = plaintextWithMetadata.byteLength - (signatureSize + ed25519PublicKeySize);
  const pubkeyEnd = plaintextWithMetadata.byteLength - signatureSize;
  const senderED25519PublicKey = plaintextWithMetadata.subarray(pubkeyStart, pubkeyEnd);
  const plainTextEnd = plaintextWithMetadata.byteLength - (signatureSize + ed25519PublicKeySize);
  const plaintext = plaintextWithMetadata.subarray(0, plainTextEnd);

  // 3. ) Verify the signature
  const isValid = sodium.crypto_sign_verify_detached(
    signature,
    concatUInt8Array(plaintext, senderED25519PublicKey, fromHexToArray(recipientX25519PublicKey)),
    senderED25519PublicKey
  );

  if (!isValid) {
    throw new Error('Invalid message signature.'); //throw Error.invalidSignature
  }
  // 4. ) Get the sender's X25519 public key
  const senderX25519PublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(senderED25519PublicKey);
  if (!senderX25519PublicKey) {
    throw new Error('Decryption failed.'); // Error.decryptionFailed
  }

  // set the sender identity on the envelope itself.
  if (isClosedGroup) {
    envelope.senderIdentity = `05${toHex(senderX25519PublicKey)}`;
  } else {
    envelope.source = `05${toHex(senderX25519PublicKey)}`;
  }
  return plaintext;
}

export async function isBlocked(number: string) {
  return BlockedNumberController.isBlockedAsync(number);
}

async function decryptUnidentifiedSender(
  envelope: EnvelopePlus,
  ciphertext: ArrayBuffer
): Promise<ArrayBuffer | null> {
  window?.log?.info('received unidentified sender message');
  try {
    const userX25519KeyPair = await UserUtils.getIdentityKeyPair();
    if (!userX25519KeyPair) {
      throw new Error('Failed to find User x25519 keypair from stage'); // noUserX25519KeyPair
    }
    const ecKeyPair = ECKeyPair.fromArrayBuffer(
      userX25519KeyPair.pubKey,
      userX25519KeyPair.privKey
    );
    // keep the await so the try catch works as expected
    const retSessionProtocol = await decryptWithSessionProtocol(envelope, ciphertext, ecKeyPair);
    return removeMessagePadding(retSessionProtocol);
  } catch (e) {
    window?.log?.warn('decryptWithSessionProtocol for unidentified message throw:', e);
    return null;
  }
}

async function doDecrypt(
  envelope: EnvelopePlus,
  ciphertext: ArrayBuffer
): Promise<ArrayBuffer | null> {
  if (ciphertext.byteLength === 0) {
    throw new Error('Received an empty envelope.'); // Error.noData
  }

  switch (envelope.type) {
    // Only SESSION_MESSAGE and CLOSED_GROUP_MESSAGE are supported
    case SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE:
      return decryptForClosedGroup(envelope, ciphertext);
    case SignalService.Envelope.Type.SESSION_MESSAGE: {
      return decryptUnidentifiedSender(envelope, ciphertext);
    }
    default:
      throw new Error(`Unknown message type:${envelope.type}`);
  }
}

// tslint:disable-next-line: max-func-body-length
async function decrypt(envelope: EnvelopePlus, ciphertext: ArrayBuffer): Promise<any> {
  try {
    const plaintext = await doDecrypt(envelope, ciphertext);

    if (!plaintext) {
      await removeFromCache(envelope);
      return null;
    }

    await updateCache(envelope, plaintext).catch((error: any) => {
      window?.log?.error(
        'decrypt failed to save decrypted message contents to cache:',
        error && error.stack ? error.stack : error
      );
    });

    return plaintext;
  } catch (error) {
    throw error;
  }
}

function shouldDropBlockedUserMessage(content: SignalService.Content): boolean {
  // Even if the user is blocked, we should allow the message if:
  //   - it is a group message AND
  //   - the group exists already on the db (to not join a closed group created by a blocked user) AND
  //   - the group is not blocked AND
  //   - the message is only control (no body/attachments/quote/groupInvitation/contact/preview)

  if (!content?.dataMessage?.group?.id) {
    return true;
  }
  const groupId = toHex(content.dataMessage.group.id);

  const groupConvo = getConversationController().get(groupId);
  if (!groupConvo) {
    return true;
  }

  if (groupConvo.isBlocked()) {
    return true;
  }

  // first check that dataMessage is the only field set in the Content
  let msgWithoutDataMessage = Lodash.pickBy(
    content,
    (_, key) => key !== 'dataMessage' && key !== 'toJSON'
  );
  msgWithoutDataMessage = Lodash.pickBy(msgWithoutDataMessage, Lodash.identity);

  const isMessageDataMessageOnly = Lodash.isEmpty(msgWithoutDataMessage);
  if (!isMessageDataMessageOnly) {
    return true;
  }
  const data = content.dataMessage;
  const isControlDataMessageOnly =
    !data.body &&
    !data.preview?.length &&
    !data.attachments?.length &&
    !data.openGroupInvitation &&
    !data.quote;

  return !isControlDataMessageOnly;
}

export async function innerHandleContentMessageBatch(
  envelopes: Array<EnvelopePlus>,
  plaintexts: Array<ArrayBuffer>
): Promise<void> {

  console.count(`innerHandleContentMessageBatch envelopes length: ${envelopes.length} ${plaintexts.length} count: `);

  try {
    const dataMessages: Array<SignalService.IDataMessage> = [];

    for (let index = 0; index < envelopes.length; index++) {
      const envelope = envelopes[index];
      const plaintext = plaintexts[index];

      // TODO: Warrick - batching just data message for now

      try {
        const content = SignalService.Content.decode(new Uint8Array(plaintext));

        const blocked = await isBlocked(envelope.source);
        if (blocked) {
          // We want to allow a blocked user message if that's a control message for a known group and the group is not blocked
          if (shouldDropBlockedUserMessage(content)) {
            window?.log?.info('Dropping blocked user message');
            continue;
          } else {
            window?.log?.info('Allowing group-control message only from blocked user');
          }
        }

        await getConversationController().getOrCreateAndWait(
          envelope.source,
          ConversationTypeEnum.PRIVATE
        );

        if (content.dataMessage) {
          if (content.dataMessage.profileKey && content.dataMessage.profileKey.length === 0) {
            content.dataMessage.profileKey = null;
          }
          // dataMessages.push({ envelope, content: content.dataMessage })
          dataMessages.push(content.dataMessage)
          // await handleDataMessage(envelope, content.dataMessage);
          continue;
        }

        if (content.receiptMessage) {
          await handleReceiptMessage(envelope, content.receiptMessage);
          continue;
        }
        if (content.typingMessage) {
          await handleTypingMessage(envelope, content.typingMessage as SignalService.TypingMessage);
          continue;
        }
        if (content.configurationMessage) {
          // this one can be quite long (downloads profilePictures and everything, is do not block)
          void handleConfigurationMessage(
            envelope,
            content.configurationMessage as SignalService.ConfigurationMessage
          );
          continue;
        }
        if (content.dataExtractionNotification) {
          await handleDataExtractionNotification(
            envelope,
            content.dataExtractionNotification as SignalService.DataExtractionNotification
          );
          continue;
        }
      } catch (e) {
        window?.log?.warn(e);
      }
    }

    handleDataMessageBatch(envelopes, dataMessages);
  } catch (err) {
    window?.log?.info(`Error handling message batch of length ${envelopes.length}`)
  }
}

export async function innerHandleContentMessage(
  envelope: EnvelopePlus,
  plaintext: ArrayBuffer
): Promise<void> {
  try {
    const content = SignalService.Content.decode(new Uint8Array(plaintext));

    const blocked = await isBlocked(envelope.source);
    if (blocked) {
      // We want to allow a blocked user message if that's a control message for a known group and the group is not blocked
      if (shouldDropBlockedUserMessage(content)) {
        window?.log?.info('Dropping blocked user message');
        return;
      } else {
        window?.log?.info('Allowing group-control message only from blocked user');
      }
    }

    await getConversationController().getOrCreateAndWait(
      envelope.source,
      ConversationTypeEnum.PRIVATE
    );

    if (content.dataMessage) {
      if (content.dataMessage.profileKey && content.dataMessage.profileKey.length === 0) {
        content.dataMessage.profileKey = null;
      }
      await handleDataMessage(envelope, content.dataMessage);
      return;
    }

    if (content.receiptMessage) {
      await handleReceiptMessage(envelope, content.receiptMessage);
      return;
    }
    if (content.typingMessage) {
      await handleTypingMessage(envelope, content.typingMessage as SignalService.TypingMessage);
      return;
    }
    if (content.configurationMessage) {
      // this one can be quite long (downloads profilePictures and everything, is do not block)
      void handleConfigurationMessage(
        envelope,
        content.configurationMessage as SignalService.ConfigurationMessage
      );
      return;
    }
    if (content.dataExtractionNotification) {
      await handleDataExtractionNotification(
        envelope,
        content.dataExtractionNotification as SignalService.DataExtractionNotification
      );
      return;
    }
  } catch (e) {
    window?.log?.warn(e);
  }
}

function onReadReceipt(readAt: any, timestamp: any, reader: any) {
  const { storage, Whisper } = window;

  window?.log?.info('read receipt', reader, timestamp);

  if (!storage.get('read-receipt-setting')) {
    return;
  }

  const receipt = Whisper.ReadReceipts.add({
    reader,
    timestamp,
    read_at: readAt,
  });

  // Calling this directly so we can wait for completion
  return Whisper.ReadReceipts.onReceipt(receipt);
}

async function handleReceiptMessage(
  envelope: EnvelopePlus,
  receiptMessage: SignalService.IReceiptMessage
) {
  const receipt = receiptMessage as SignalService.ReceiptMessage;

  const { type, timestamp } = receipt;

  const results = [];
  if (type === SignalService.ReceiptMessage.Type.READ) {
    for (const ts of timestamp) {
      const promise = onReadReceipt(
        Lodash.toNumber(envelope.timestamp),
        Lodash.toNumber(ts),
        envelope.source
      );
      results.push(promise);
    }
  }
  await Promise.all(results);

  await removeFromCache(envelope);
}

async function handleTypingMessage(
  envelope: EnvelopePlus,
  typingMessage: SignalService.TypingMessage
): Promise<void> {
  const { timestamp, action } = typingMessage;
  const { source } = envelope;

  await removeFromCache(envelope);

  // We don't do anything with incoming typing messages if the setting is disabled
  if (!window.storage.get('typing-indicators-setting')) {
    return;
  }

  if (envelope.timestamp && timestamp) {
    const envelopeTimestamp = Lodash.toNumber(envelope.timestamp);
    const typingTimestamp = Lodash.toNumber(timestamp);

    if (typingTimestamp !== envelopeTimestamp) {
      window?.log?.warn(
        `Typing message envelope timestamp (${envelopeTimestamp}) did not match typing timestamp (${typingTimestamp})`
      );
      return;
    }
  }

  // typing message are only working with direct chats/ not groups
  const conversation = getConversationController().get(source);

  const started = action === SignalService.TypingMessage.Action.STARTED;

  if (conversation) {
    await conversation.notifyTyping({
      isTyping: started,
      sender: source,
    });
  }
}

/**
 * A DataExtractionNotification message can only come from a 1 o 1 conversation.
 *
 * We drop them if the convo is not a 1 o 1 conversation.
 */
export async function handleDataExtractionNotification(
  envelope: EnvelopePlus,
  dataNotificationMessage: SignalService.DataExtractionNotification
): Promise<void> {
  // we currently don't care about the timestamp included in the field itself, just the timestamp of the envelope
  const { type, timestamp: referencedAttachment } = dataNotificationMessage;

  const { source, timestamp } = envelope;
  await removeFromCache(envelope);

  const convo = getConversationController().get(source);
  if (!convo || !convo.isPrivate()) {
    window?.log?.info('Got DataNotification for unknown or non private convo');
    return;
  }

  if (!type || !source) {
    window?.log?.info('DataNotification pre check failed');

    return;
  }

  if (timestamp) {
    const envelopeTimestamp = Lodash.toNumber(timestamp);
    const referencedAttachmentTimestamp = Lodash.toNumber(referencedAttachment);
    const now = Date.now();

    await convo.addSingleMessage({
      conversationId: convo.get('id'),
      type: 'outgoing', // mark it as outgoing just so it appears below our sent attachment
      sent_at: envelopeTimestamp,
      received_at: now,
      dataExtractionNotification: {
        type,
        referencedAttachmentTimestamp, // currently unused
        source,
      },
      unread: 1, // 1 means unread
      expireTimer: 0,
    });
    convo.updateLastMessage();
  }
}
