/* global window, libsignal, textsecure */

// eslint-disable-next-line func-names
(function() {
  window.libloki = window.libloki || {};

  const IV_LENGTH = 16;

  FallBackSessionCipher = function (address) {
    this.pubKey = StringView.hexToArrayBuffer(address.getName());

    this.encrypt = async (plaintext) => {
      const myKeyPair = await textsecure.storage.protocol.getIdentityKeyPair();
      const myPrivateKey = myKeyPair.privKey;
      const symmetricKey = libsignal.Curve.calculateAgreement(this.pubKey, myPrivateKey);
      const iv = libsignal.crypto.getRandomBytes(IV_LENGTH);
      const ciphertext = await libsignal.crypto.encrypt(symmetricKey, plaintext, iv);
      const ivAndCiphertext = new Uint8Array(
        iv.byteLength + ciphertext.byteLength
      );
      ivAndCiphertext.set(new Uint8Array(iv));
      ivAndCiphertext.set(
        new Uint8Array(ciphertext),
        iv.byteLength
      );

      return {
          type           : 6, //friend request
          body           : new dcodeIO.ByteBuffer.wrap(ivAndCiphertext).toString('binary'),
          registrationId : null
      };
    },

    this.decrypt = async (ivAndCiphertext) => {
      const iv = ivAndCiphertext.slice(0, IV_LENGTH);
      const cipherText = ivAndCiphertext.slice(IV_LENGTH);
      const myKeyPair = await textsecure.storage.protocol.getIdentityKeyPair();
      const myPrivateKey = myKeyPair.privKey;
      const symmetricKey = libsignal.Curve.calculateAgreement(this.pubKey, myPrivateKey);
      const plaintext = await libsignal.crypto.decrypt(symmetricKey, cipherText, iv);
      return plaintext;
    }
  }

  getPreKeyBundleForNumber = async function(pubkey) {
    // TODO: check if already generated and stored in db for the given pubkey, then return that

    const myKeyPair = await textsecure.storage.protocol.getIdentityKeyPair();
    const identityKey = myKeyPair.pubKey;

    // Retrieve ids. The ids stored are always the latest generated + 1
    const signedKeyId = textsecure.storage.get('signedKeyId', 1) - 1;
    const preKeyId = textsecure.storage.get('maxPreKeyId', 1);
    
    const [signedKey, preKey] = await Promise.all([
      textsecure.storage.protocol.loadSignedPreKey(signedKeyId).then(signedKey => signedKey.pubKey),
      new Promise(async (resolve, reject) => {
        const preKey = await libsignal.KeyHelper.generatePreKey(preKeyId);
        await textsecure.storage.protocol.storePreKey(preKey.keyId, preKey.keyPair);
        resolve(preKey.keyPair.pubKey);
      })
    ]);

    const preKeyMessage = new textsecure.protobuf.PreKeyBundleMessage({
      identityKey,
	    deviceId: 1,        // TODO: fetch from somewhere
	    preKeyId,
	    signedKeyId,
      preKey,
      signedKey,
    });

    return preKeyMessage;
  }
  
  window.libloki.FallBackSessionCipher = FallBackSessionCipher;
  window.libloki.getPreKeyBundleForNumber = getPreKeyBundleForNumber;

})();