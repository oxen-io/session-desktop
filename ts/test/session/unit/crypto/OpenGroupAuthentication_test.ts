import chai, { expect } from 'chai';
import chaiBytes from 'chai-bytes';
import { SogsBlinding } from '../../../../session/apis/open_group_api/sogsv3/sogsBlinding';
import { ByteKeyPair } from '../../../../session/utils/User';
import { to_hex } from 'libsodium-wrappers-sumo';
import { fromBase64, fromHex } from 'bytebuffer';
import { StringUtils } from '../../../../session/utils';

chai.use(chaiBytes);

// tslint:disable-next-line: max-func-body-length
describe('OpenGroupAuthentication', () => {
  const secondPartPrivKey = new Uint8Array([
    186,
    198,
    231,
    30,
    253,
    125,
    250,
    74,
    131,
    201,
    142,
    210,
    79,
    37,
    74,
    178,
    194,
    103,
    249,
    204,
    219,
    23,
    42,
    82,
    128,
    160,
    68,
    74,
    210,
    78,
    137,
    204,
  ]);
  const signingKeysA: ByteKeyPair = {
    // 881132ee03dbd2da065aa4c94f96081f62142dc8011d1b7a00de83e4aab38ce4
    privKeyBytes: new Uint8Array([
      192,
      16,
      216,
      158,
      204,
      186,
      245,
      209,
      198,
      209,
      157,
      247,
      102,
      198,
      238,
      223,
      150,
      93,
      74,
      40,
      165,
      111,
      135,
      201,
      252,
      129,
      158,
      219,
      89,
      137,
      109,
      217,
      ...secondPartPrivKey,
    ]),
    // 057aecdcade88d881d2327ab011afd2e04c2ec6acffc9e9df45aaf78a151bd2f7d
    pubKeyBytes: secondPartPrivKey,
  };

  const signingKeysB: ByteKeyPair = {
    privKeyBytes: new Uint8Array([
      130,
      56,
      83,
      227,
      58,
      149,
      251,
      148,
      119,
      85,
      180,
      81,
      17,
      190,
      245,
      33,
      219,
      6,
      246,
      238,
      110,
      61,
      191,
      133,
      244,
      223,
      32,
      32,
      121,
      172,
      138,
      198,
      215,
      25,
      249,
      139,
      235,
      31,
      251,
      12,
      100,
      87,
      84,
      131,
      231,
      45,
      87,
      251,
      204,
      133,
      20,
      3,
      118,
      71,
      29,
      47,
      245,
      62,
      216,
      163,
      254,
      248,
      195,
      109,
    ]),
    pubKeyBytes: new Uint8Array([
      215,
      25,
      249,
      139,
      235,
      31,
      251,
      12,
      100,
      87,
      84,
      131,
      231,
      45,
      87,
      251,
      204,
      133,
      20,
      3,
      118,
      71,
      29,
      47,
      245,
      62,
      216,
      163,
      254,
      248,
      195,
      109,
    ]),
  };
  const serverPubKey = new Uint8Array(
    fromHex('c3b3c6f32f0ab5a57f853cc4f30f5da7fda5624b0c77b3fb0829de562ada081d').toArrayBuffer()
  );

  const ts = 1642472103;
  const method = 'GET';
  const path = '/room/the-best-room/messages/recent?limit=25';

  const nonce = new Uint8Array(fromBase64('CdB5nyKVmQGCw6s0Bvv8Ww==').toArrayBuffer());

  const body = 'hello 🎂';

  // tslint:disable-next-line: max-func-body-length
  describe('HeaderCreation', () => {
    describe('Blinded Headers', () => {
      it('should produce correct X-SOGS-Nonce', async () => {
        const headers = await SogsBlinding.getOpenGroupHeaders({
          signingKeys: signingKeysA,
          serverPK: serverPubKey,
          nonce,
          method,
          path,
          timestamp: ts,
          blinded: true,
          body: null,
        });
        expect(headers['X-SOGS-Nonce']).to.be.equal('CdB5nyKVmQGCw6s0Bvv8Ww==');
      });

      it('should produce correct X-SOGS-Pubkey', async () => {
        const headers = await SogsBlinding.getOpenGroupHeaders({
          signingKeys: signingKeysA,
          serverPK: serverPubKey,
          nonce,
          method,
          path,
          timestamp: ts,
          blinded: true,
          body: null,
        });
        expect(headers['X-SOGS-Pubkey']).to.be.equal(
          '1598932d4bccbe595a8789d7eb1629cefc483a0eaddc7e20e8fe5c771efafd9af5'
        );
      });

      it('should produce correct X-SOGS-Timestamp', async () => {
        const headers = await SogsBlinding.getOpenGroupHeaders({
          signingKeys: signingKeysA,
          serverPK: serverPubKey,
          nonce,
          method,
          path,
          timestamp: ts,
          blinded: true,
          body: null,
        });
        expect(headers['X-SOGS-Timestamp']).to.be.equal('1642472103');
      });
      it('should produce correct X-SOGS-Signature without body', async () => {
        const headers = await SogsBlinding.getOpenGroupHeaders({
          signingKeys: signingKeysA,
          serverPK: serverPubKey,
          nonce,
          method,
          path,
          timestamp: ts,
          blinded: true,
          body: null,
        });
        expect(headers['X-SOGS-Signature']).to.be.equal(
          'gYqpWZX6fnF4Gb2xQM3xaXs0WIYEI49+B8q4mUUEg8Rw0ObaHUWfoWjMHMArAtP9QlORfiydsKWz1o6zdPVeCQ=='
        );
      });

      it('should produce correct X-SOGS-Signature with body', async () => {
        const headers = await SogsBlinding.getOpenGroupHeaders({
          signingKeys: signingKeysA,
          serverPK: serverPubKey,
          nonce,
          method,
          path,
          timestamp: ts,
          blinded: true,
          body,
        });
        expect(headers['X-SOGS-Signature']).to.be.equal(
          'hZCg5pEoy9t98umaY6fNarzcLP5UKUF8chz5mIjwwrRIQLy1kinRoYcNPdFOpJu8heA0val4viymXRTp1DGeBg=='
        );
      });
    });

    describe('Unblinded Headers', () => {
      it('should produce correct X-SOGS-Nonce', async () => {
        const headers = await SogsBlinding.getOpenGroupHeaders({
          signingKeys: signingKeysA,
          serverPK: serverPubKey,
          nonce,
          method,
          path,
          timestamp: ts,
          blinded: false,
          body: null,
        });
        expect(headers['X-SOGS-Nonce']).to.be.equal('CdB5nyKVmQGCw6s0Bvv8Ww==');
      });

      it('should produce correct X-SOGS-Pubkey', async () => {
        const headers = await SogsBlinding.getOpenGroupHeaders({
          signingKeys: signingKeysA,
          serverPK: serverPubKey,
          nonce,
          method,
          path,
          timestamp: ts,
          blinded: false,
          body: null,
        });
        expect(headers['X-SOGS-Pubkey']).to.be.equal(
          '00bac6e71efd7dfa4a83c98ed24f254ab2c267f9ccdb172a5280a0444ad24e89cc'
        );
      });

      it('should produce correct X-SOGS-Timestamp', async () => {
        const headers = await SogsBlinding.getOpenGroupHeaders({
          signingKeys: signingKeysA,
          serverPK: serverPubKey,
          nonce,
          method,
          path,
          timestamp: ts,
          blinded: false,
          body: null,
        });
        expect(headers['X-SOGS-Timestamp']).to.be.equal('1642472103');
      });
      it('should produce correct X-SOGS-Signature without body', async () => {
        const headers = await SogsBlinding.getOpenGroupHeaders({
          signingKeys: signingKeysA,
          serverPK: serverPubKey,
          nonce,
          method,
          path,
          timestamp: ts,
          blinded: false,
          body: null,
        });
        expect(headers['X-SOGS-Signature']).to.be.equal(
          'xxLpXHbomAJMB9AtGMyqvBsXrdd2040y+Ol/IKzElWfKJa3EYZRv1GLO6CTLhrDFUwVQe8PPltyGs54Kd7O5Cg=='
        );
      });

      it('should produce correct X-SOGS-Signature with body', async () => {
        const headers = await SogsBlinding.getOpenGroupHeaders({
          signingKeys: signingKeysA,
          serverPK: serverPubKey,
          nonce,
          method,
          path,
          timestamp: ts,
          blinded: false,
          body,
        });
        expect(headers['X-SOGS-Signature']).to.be.equal(
          'uumZNee7NUb0lVufegjzgjjnj4pe3kAe6OYw7iVTJrcxxxdIxUCgt5/xliBWqPlgY6ReUZRAuptNa4nprv7nCA=='
        );
      });
    });
  });

  describe('Blinded Message Encryption', () => {
    it('Should encrypt blinded message correctly', async () => {
      const dataUint = new Uint8Array(StringUtils.encode(body, 'utf8'));
      const data = await SogsBlinding.encryptBlindedMessage({
        rawData: dataUint,
        senderSigningKey: signingKeysA,
        serverPubKey,
        recipientSigningKey: signingKeysB,
      });
      if (data) {
        const decrypted = await SogsBlinding.decryptBlindedMessage(
          data,
          signingKeysA,
          signingKeysB,
          serverPubKey
        );
        expect(decrypted?.messageText).to.be.equal(body);
        expect(decrypted?.senderED25519PubKey).to.be.equal(to_hex(signingKeysA.pubKeyBytes));
      }
    });
  });

  // tslint:disable-next-line: no-empty
  describe('Message Decryption', () => {
    it.skip('Message Decryption', () => {
      // TODO: update input and expected output
    });
  });

  describe('V4Requests', () => {
    it.skip('Should bencode POST/PUT request with body successfully', () => {
      // TODO: update input and expected output
      // const bencoded = encodeV4Request(postDataToEncoded);
      // expect(bencoded).to.be.equal(
      //   'l100:{"method":"POST","endpoint":"/room/test-room/pin/123","headers":{"Content-Type":"application/json"}}2:{}e'
      // );
    });

    it.skip('Should bencode GET request without body successfully', () => {
      // TODO: change ot accept request info and expect uint8 array output
      // const bencoded = encodeV4Request(getDataToEncode);
      // expect(bencoded).to.be.equal('l45:{"method":"GET","endpoint":"/room/test-room"}e');
    });

    it.skip('Should decode bencoded response successfully', () => {
      // TODO: update input and expected output
      // const bencoded = decodeV4Response(responseToDecode);
      // console.warn({ bencoded });
    });
  });
});