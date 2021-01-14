/* eslint-env browser */
/* global dcodeIO, libsignal, getSodium */

/* eslint-disable camelcase, no-bitwise */

module.exports = {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  bytesFromString,
  concatenateBytes,
  constantTimeEqual,
  decryptAttachment,
  decryptFile,
  decryptSymmetric,
  deriveAccessKey,
  encryptAttachment,
  encryptFile,
  encryptSymmetric,
  getZeroes, // getZeroes
  hmacSha256,
  stringFromBytes,
};

function arrayBufferToBase64(arrayBuffer) {
  return dcodeIO.ByteBuffer.wrap(arrayBuffer).toString('base64');
}
function base64ToArrayBuffer(base64string) {
  return dcodeIO.ByteBuffer.wrap(base64string, 'base64').toArrayBuffer();
}


function bytesFromString(string) {
  return dcodeIO.ByteBuffer.wrap(string, 'utf8').toArrayBuffer();
}
function stringFromBytes(buffer) {
  return dcodeIO.ByteBuffer.wrap(buffer).toString('utf8');
}

// High-level Operations
// Path structure: 'fa/facdf99c22945b1c9393345599a276f4b36ad7ccdc8c2467f5441b742c2d11fa'
function getAttachmentLabel(path) {
  const filename = path.slice(3);
  return base64ToArrayBuffer(filename);
}

const PUB_KEY_LENGTH = 32;
async function encryptAttachment(staticPublicKey, path, plaintext) {
  const uniqueId = getAttachmentLabel(path);
  return encryptFile(staticPublicKey, uniqueId, plaintext);
}

async function decryptAttachment(staticPrivateKey, path, data) {
  const uniqueId = getAttachmentLabel(path);
  return decryptFile(staticPrivateKey, uniqueId, data);
}

async function encryptFile(staticPublicKey, uniqueId, plaintext) {
  const ephemeralKeyPair = await libsignal.KeyHelper.generateIdentityKeyPair();
  const agreement = await libsignal.Curve.async.calculateAgreement(
    staticPublicKey,
    ephemeralKeyPair.privKey
  );
  const key = await hmacSha256(agreement, uniqueId);

  const prefix = ephemeralKeyPair.pubKey.slice(1);
  return concatenateBytes(prefix, await encryptSymmetric(key, plaintext));
}

async function decryptFile(staticPrivateKey, uniqueId, data) {
  const ephemeralPublicKey = _getFirstBytes(data, PUB_KEY_LENGTH);
  const ciphertext = _getBytes(data, PUB_KEY_LENGTH, data.byteLength);
  const agreement = await libsignal.Curve.async.calculateAgreement(
    ephemeralPublicKey,
    staticPrivateKey
  );

  const key = await hmacSha256(agreement, uniqueId);

  return decryptSymmetric(key, ciphertext);
}

async function deriveAccessKey(profileKey) {
  const iv = getZeroes(12);
  const plaintext = getZeroes(16);
  const accessKey = await _encrypt_aes_gcm(profileKey, iv, plaintext);
  return _getFirstBytes(accessKey, 16);
}

const IV_LENGTH = 16;
const MAC_LENGTH = 16;
const NONCE_LENGTH = 16;

async function encryptSymmetric(key, plaintext) {
  const iv = getZeroes(IV_LENGTH);
  const sodium = await window.getSodium();
  const nonce = sodium.randombytes_buf(NONCE_LENGTH);

  const cipherKey = await hmacSha256(key, nonce);
  const macKey = await hmacSha256(key, cipherKey);

  const cipherText = await _encrypt_aes256_CBC_PKCSPadding(
    cipherKey,
    iv,
    plaintext
  );
  const mac = _getFirstBytes(await hmacSha256(macKey, cipherText), MAC_LENGTH);

  return concatenateBytes(nonce, cipherText, mac);
}

async function decryptSymmetric(key, data) {
  const iv = getZeroes(IV_LENGTH);

  const nonce = _getFirstBytes(data, NONCE_LENGTH);
  const cipherText = _getBytes(
    data,
    NONCE_LENGTH,
    data.byteLength - NONCE_LENGTH - MAC_LENGTH
  );
  const theirMac = _getBytes(data, data.byteLength - MAC_LENGTH, MAC_LENGTH);

  const cipherKey = await hmacSha256(key, nonce);
  const macKey = await hmacSha256(key, cipherKey);

  const ourMac = _getFirstBytes(
    await hmacSha256(macKey, cipherText),
    MAC_LENGTH
  );
  if (!constantTimeEqual(theirMac, ourMac)) {
    throw new Error(
      'decryptSymmetric: Failed to decrypt; MAC verification failed'
    );
  }

  return _decrypt_aes256_CBC_PKCSPadding(cipherKey, iv, cipherText);
}

function constantTimeEqual(left, right) {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  let result = 0;
  const ta1 = new Uint8Array(left);
  const ta2 = new Uint8Array(right);
  for (let i = 0, max = left.byteLength; i < max; i += 1) {
    // eslint-disable-next-line no-bitwise
    result |= ta1[i] ^ ta2[i];
  }
  return result === 0;
}

// Encryption

async function hmacSha256(key, plaintext) {
  const algorithm = {
    name: 'HMAC',
    hash: 'SHA-256',
  };
  const extractable = false;

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    key,
    algorithm,
    extractable,
    ['sign']
  );

  return window.crypto.subtle.sign(algorithm, cryptoKey, plaintext);
}

async function _encrypt_aes256_CBC_PKCSPadding(key, iv, plaintext) {
  const algorithm = {
    name: 'AES-CBC',
    iv,
  };
  const extractable = false;

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    key,
    algorithm,
    extractable,
    ['encrypt']
  );

  return window.crypto.subtle.encrypt(algorithm, cryptoKey, plaintext);
}

async function _decrypt_aes256_CBC_PKCSPadding(key, iv, plaintext) {
  const algorithm = {
    name: 'AES-CBC',
    iv,
  };
  const extractable = false;

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    key,
    algorithm,
    extractable,
    ['decrypt']
  );
  return window.crypto.subtle.decrypt(algorithm, cryptoKey, plaintext);
}

async function _encrypt_aes_gcm(key, iv, plaintext) {
  const algorithm = {
    name: 'AES-GCM',
    iv,
  };
  const extractable = false;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    algorithm,
    extractable,
    ['encrypt']
  );
  return crypto.subtle.encrypt(algorithm, cryptoKey, plaintext);
}

// Utility


function getZeroes(n) {
  const result = new Uint8Array(n);

  const value = 0;
  const startIndex = 0;
  const endExclusive = n;
  result.fill(value, startIndex, endExclusive);

  return result;
}


function concatenateBytes(...elements) {
  const length = elements.reduce(
    (total, element) => total + element.byteLength,
    0
  );

  const result = new Uint8Array(length);
  let position = 0;

  for (let i = 0, max = elements.length; i < max; i += 1) {
    const element = new Uint8Array(elements[i]);
    result.set(element, position);
    position += element.byteLength;
  }
  if (position !== result.length) {
    throw new Error('problem concatenating!');
  }

  return result.buffer;
}

// Internal-only

function _getFirstBytes(data, n) {
  const source = new Uint8Array(data);
  return source.subarray(0, n);
}

function _getBytes(data, start, n) {
  const source = new Uint8Array(data);
  return source.subarray(start, start + n);
}
