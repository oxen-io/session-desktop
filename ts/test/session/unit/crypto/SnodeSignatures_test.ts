import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { UserGroupsGet } from 'libsession_util_nodejs';
import Sinon from 'sinon';
import { HexString } from '../../../../node/hexStrings';
import { getSodiumNode } from '../../../../node/sodiumNode';
import { GetNetworkTime } from '../../../../session/apis/snode_api/getNetworkTime';
import { SnodeNamespaces } from '../../../../session/apis/snode_api/namespaces';
import { SnodeGroupSignature } from '../../../../session/apis/snode_api/signature/groupSignature';
import { SnodeSignature } from '../../../../session/apis/snode_api/signature/snodeSignatures';
import { WithSignature } from '../../../../session/apis/snode_api/types';
import { concatUInt8Array } from '../../../../session/crypto';
import { UserUtils } from '../../../../session/utils';
import { fromBase64ToArray, fromHexToArray } from '../../../../session/utils/String';

use(chaiAsPromised);

const validGroupPk = '030442ca9b758eefe0c42370696688b28f48f44bf44941fae4f3d5b41f6358c41d';
const privKeyUint = concatUInt8Array(
  fromHexToArray('4db38882cf0a0fffcbb971eb2b1420c92bc836c6946cd97bdc0c2787b806549d'),
  fromHexToArray(validGroupPk.slice(2))
); // len 64

const userEd25519Keypair = {
  pubKey: 'bdd5eaf00eaf965ca63b7e8b119d8122d4647ffd5bb58daa1f78dfc54dd53989',
  privKey:
    'b0e12943e22e8f71774c2c4205fed59800000000000000000000000000000000bdd5eaf00eaf965ca63b7e8b119d8122d4647ffd5bb58daa1f78dfc54dd53989',
};

// Keep the line below as we might need it for tests, and it is linked to the values above
// const _currentUserSubAccountAuthData = fromHexToArray(
// eslint-disable-next-line max-len
//   '03030000cdbc07f46c4b322767675240d5945e902c75f0d3c46f36735b93773577d69e037c5d75d378a8e7183f9012b39bc27de7f81afe9c7000aa924fbcad8a7e6f12fec809adae65a1c427feb9c4b1ad453df403079f62203aa0563533b2b114f31b07'
// );

function getEmptyUserGroup() {
  return {
    secretKey: null,
    authData: null,
    invitePending: false,
    joinedAtSeconds: 1234,
    kicked: false,
    name: '1243',
    priority: 0,
    pubkeyHex: validGroupPk,
  } as UserGroupsGet;
}

const hardcodedTimestamp = 1234;

async function verifySig(ret: WithSignature & { pubkey: string }, verificationData: string) {
  const without03 =
    ret.pubkey.startsWith('03') || ret.pubkey.startsWith('05') ? ret.pubkey.slice(2) : ret.pubkey;
  const pk = HexString.fromHexString(without03);
  const sodium = await getSodiumNode();
  const verified = sodium.crypto_sign_verify_detached(
    fromBase64ToArray(ret.signature),
    verificationData,
    pk
  );

  if (!verified) {
    throw new Error('sig failed to be verified');
  }
}

describe('SnodeSignature', () => {
  afterEach(() => {
    Sinon.restore();
  });

  describe('getSnodeGroupAdminSignatureParams', () => {
    beforeEach(() => {
      Sinon.stub(GetNetworkTime, 'now').returns(hardcodedTimestamp);
    });

    describe('retrieve', () => {
      it('retrieve namespace ClosedGroupInfo', async () => {
        const ret = await SnodeGroupSignature.getSnodeGroupSignature({
          method: 'retrieve',
          namespace: SnodeNamespaces.ClosedGroupInfo,
          group: {
            authData: null,
            pubkeyHex: validGroupPk,
            secretKey: privKeyUint,
          },
        });
        expect(ret.pubkey).to.be.eq(validGroupPk);

        expect(ret.timestamp).to.be.eq(hardcodedTimestamp);
        const verificationData = `retrieve${SnodeNamespaces.ClosedGroupInfo}${hardcodedTimestamp}`;
        await verifySig(ret, verificationData);
      });

      it('retrieve namespace ClosedGroupKeys', async () => {
        const ret = await SnodeGroupSignature.getSnodeGroupSignature({
          method: 'retrieve',
          namespace: SnodeNamespaces.ClosedGroupKeys,
          group: {
            authData: null,
            pubkeyHex: validGroupPk,
            secretKey: privKeyUint,
          },
        });
        expect(ret.pubkey).to.be.eq(validGroupPk);

        expect(ret.timestamp).to.be.eq(hardcodedTimestamp);
        const verificationData = `retrieve${SnodeNamespaces.ClosedGroupKeys}${hardcodedTimestamp}`;

        await verifySig(ret, verificationData);
      });

      it('retrieve namespace ClosedGroupMessages', async () => {
        const ret = await SnodeGroupSignature.getSnodeGroupSignature({
          method: 'retrieve',
          namespace: SnodeNamespaces.ClosedGroupMessages,
          group: {
            authData: null,
            pubkeyHex: validGroupPk,
            secretKey: privKeyUint,
          },
        });
        expect(ret.pubkey).to.be.eq(validGroupPk);

        expect(ret.timestamp).to.be.eq(hardcodedTimestamp);
        const verificationData = `retrieve${SnodeNamespaces.ClosedGroupMessages}${hardcodedTimestamp}`;
        await verifySig(ret, verificationData);
      });
    });

    describe('store', () => {
      it('store namespace ClosedGroupInfo', async () => {
        const ret = await SnodeGroupSignature.getSnodeGroupSignature({
          method: 'store',
          namespace: SnodeNamespaces.ClosedGroupInfo,
          group: {
            authData: null,
            pubkeyHex: validGroupPk,
            secretKey: privKeyUint,
          },
        });
        expect(ret.pubkey).to.be.eq(validGroupPk);
        expect(ret.timestamp).to.be.eq(hardcodedTimestamp);

        const verificationData = `store${SnodeNamespaces.ClosedGroupInfo}${hardcodedTimestamp}`;
        await verifySig(ret, verificationData);
      });

      it('store namespace ClosedGroupKeys', async () => {
        const ret = await SnodeGroupSignature.getSnodeGroupSignature({
          method: 'store',
          namespace: SnodeNamespaces.ClosedGroupKeys,
          group: {
            authData: null,
            pubkeyHex: validGroupPk,
            secretKey: privKeyUint,
          },
        });
        expect(ret.pubkey).to.be.eq(validGroupPk);

        expect(ret.timestamp).to.be.eq(hardcodedTimestamp);
        const verificationData = `store${SnodeNamespaces.ClosedGroupKeys}${hardcodedTimestamp}`;
        await verifySig(ret, verificationData);
      });

      it('store namespace ClosedGroupMessages', async () => {
        const ret = await SnodeGroupSignature.getSnodeGroupSignature({
          method: 'store',
          namespace: SnodeNamespaces.ClosedGroupMessages,
          group: {
            authData: null,
            pubkeyHex: validGroupPk,
            secretKey: privKeyUint,
          },
        });
        expect(ret.pubkey).to.be.eq(validGroupPk);
        expect(ret.timestamp).to.be.eq(hardcodedTimestamp);
        const verificationData = `store${SnodeNamespaces.ClosedGroupMessages}${hardcodedTimestamp}`;
        await verifySig(ret, verificationData);
      });
    });
  });

  describe('getGroupSignatureByHashesParams', () => {
    beforeEach(() => {
      Sinon.stub(GetNetworkTime, 'now').returns(hardcodedTimestamp);
    });

    describe('delete', () => {
      it('can sign a delete with admin secretkey', async () => {
        const hashes = ['hash4321', 'hash4221'];
        const group = getEmptyUserGroup();

        const ret = await SnodeGroupSignature.getGroupSignatureByHashesParams({
          method: 'delete',
          groupPk: validGroupPk,
          messagesHashes: hashes,
          group: { ...group, secretKey: privKeyUint },
        });
        expect(ret.pubkey).to.be.eq(validGroupPk);
        expect(ret.messages).to.be.deep.eq(hashes);

        const verificationData = `delete${hashes.join('')}`;
        await verifySig(ret, verificationData);
      });

      it.skip('can sign a delete with authData if adminSecretKey is empty', async () => {
        // we can't really test this atm. We'd need the full env of wrapper setup as we need need for the subaccountSign itself, part of the wrapper
        // const hashes = ['hash4321', 'hash4221'];
        // const group = getEmptyUserGroup();
        // const ret = await SnodeGroupSignature.getGroupSignatureByHashesParams({
        //   method: 'delete',
        //   groupPk: validGroupPk,
        //   messagesHashes: hashes,
        //   group: { ...group, authData: currentUserSubAccountAuthData },
        // });
        // expect(ret.pubkey).to.be.eq(validGroupPk);
        // expect(ret.messages).to.be.deep.eq(hashes);
        // const verificationData = `delete${hashes.join('')}`;
        // await verifySig(ret, verificationData);
      });

      it('throws if none are set', async () => {
        const hashes = ['hash4321', 'hash4221'];

        const group = getEmptyUserGroup();
        const fn = async () =>
          SnodeGroupSignature.getGroupSignatureByHashesParams({
            method: 'delete',
            groupPk: validGroupPk,
            messagesHashes: hashes,
            group,
          });
        expect(fn).to.throw;
      });
    });
  });

  describe('generateUpdateExpiryGroupSignature', () => {
    it('throws if groupPk not given', async () => {
      const func = async () => {
        return SnodeGroupSignature.generateUpdateExpiryGroupSignature({
          group: { pubkeyHex: null as any, secretKey: privKeyUint, authData: null },
          messagesHashes: ['[;p['],
          shortenOrExtend: '',
          expiryMs: hardcodedTimestamp,
        });
      };
      await expect(func()).to.be.rejectedWith(
        'generateUpdateExpiryGroupSignature groupPk is empty'
      );
    });

    it('throws if groupPrivKey is empty', async () => {
      const func = async () => {
        return SnodeGroupSignature.generateUpdateExpiryGroupSignature({
          group: {
            pubkeyHex: validGroupPk as any,
            secretKey: new Uint8Array() as any,
            authData: null,
          },

          messagesHashes: ['[;p['],
          shortenOrExtend: '',
          expiryMs: hardcodedTimestamp,
        });
      };
      await expect(func()).to.be.rejectedWith(
        'retrieveRequestForGroup: needs either groupSecretKey or authData'
      );
    });

    it('works with valid pubkey and privkey', async () => {
      const hashes = ['hash4321', 'hash4221'];
      const expiryMs = hardcodedTimestamp;
      const shortenOrExtend = '';
      const ret = await SnodeGroupSignature.generateUpdateExpiryGroupSignature({
        group: { pubkeyHex: validGroupPk, secretKey: privKeyUint, authData: null },
        messagesHashes: hashes,
        shortenOrExtend: '',
        expiryMs,
      });

      expect(ret.pubkey).to.be.eq(validGroupPk);

      const verificationData = `expire${shortenOrExtend}${expiryMs}${hashes.join('')}`;
      await verifySig(ret, verificationData);
    });

    it('fails with invalid timestamp', async () => {
      const hashes = ['hash4321', 'hash4221'];
      const expiryMs = hardcodedTimestamp;
      const shortenOrExtend = '';
      const ret = await SnodeGroupSignature.generateUpdateExpiryGroupSignature({
        group: { pubkeyHex: validGroupPk, secretKey: privKeyUint, authData: null },
        messagesHashes: hashes,
        shortenOrExtend: '',
        expiryMs,
      });

      expect(ret.pubkey).to.be.eq(validGroupPk);

      const verificationData = `expire${shortenOrExtend}${expiryMs}1${hashes.join('')}`;
      const func = async () => verifySig(ret, verificationData);
      await expect(func()).rejectedWith('sig failed to be verified');
    });

    it('fails with invalid hashes', async () => {
      const hashes = ['hash4321', 'hash4221'];
      const expiryMs = hardcodedTimestamp;
      const shortenOrExtend = '';
      const ret = await SnodeGroupSignature.generateUpdateExpiryGroupSignature({
        group: { pubkeyHex: validGroupPk, secretKey: privKeyUint, authData: null },
        messagesHashes: hashes,
        shortenOrExtend: '',
        expiryMs,
      });

      expect(ret.pubkey).to.be.eq(validGroupPk);

      const overridenHash = hashes.slice();
      overridenHash[0] = '1111';
      const verificationData = `expire${shortenOrExtend}${expiryMs}${overridenHash.join('')}`;
      const func = async () => verifySig(ret, verificationData);
      await expect(func()).rejectedWith('sig failed to be verified');
    });

    it('fails with invalid number of hashes', async () => {
      const hashes = ['hash4321', 'hash4221'];
      const expiryMs = hardcodedTimestamp;
      const shortenOrExtend = '';
      const ret = await SnodeGroupSignature.generateUpdateExpiryGroupSignature({
        group: { pubkeyHex: validGroupPk, secretKey: privKeyUint, authData: null },
        messagesHashes: hashes,
        shortenOrExtend: '',
        expiryMs,
      });

      expect(ret.pubkey).to.be.eq(validGroupPk);

      const overridenHash = [hashes[0]];
      const verificationData = `expire${shortenOrExtend}${expiryMs}${overridenHash.join('')}`;
      const func = async () => verifySig(ret, verificationData);
      await expect(func()).rejectedWith('sig failed to be verified');
    });
  });

  describe('generateUpdateExpiryOurSignature', () => {
    it('throws if our ed keypair is not set', async () => {
      Sinon.stub(UserUtils, 'getUserED25519KeyPair').resolves(null as any);

      const func = async () => {
        const hashes = ['hash4321', 'hash4221'];
        const shortenOrExtend = '';
        return SnodeSignature.generateUpdateExpiryOurSignature({
          messagesHashes: hashes,
          shortenOrExtend,
          timestamp: hardcodedTimestamp,
        });
      };

      await expect(func()).to.be.rejectedWith(
        'getSnodeSignatureParams "expiry": User has no getUserED25519KeyPair()'
      );
    });

    it('throws if invalid hashes', async () => {
      Sinon.stub(UserUtils, 'getUserED25519KeyPair').resolves(userEd25519Keypair);

      const hashes = ['hash4321', 'hash4221'];
      const shortenOrExtend = '';
      const ret = await SnodeSignature.generateUpdateExpiryOurSignature({
        messagesHashes: hashes,
        shortenOrExtend,
        timestamp: hardcodedTimestamp,
      });
      const overridenHash = [hashes[0]];
      const verificationData = `expire${shortenOrExtend}${hardcodedTimestamp}${overridenHash.join(
        ''
      )}`;

      const func = async () => {
        return verifySig(ret, verificationData);
      };
      await expect(func()).to.be.rejectedWith('sig failed to be verified');
    });

    it('throws if invalid timestamp', async () => {
      Sinon.stub(UserUtils, 'getUserED25519KeyPair').resolves(userEd25519Keypair);

      const hashes = ['hash4321', 'hash4221'];
      const shortenOrExtend = '';
      const ret = await SnodeSignature.generateUpdateExpiryOurSignature({
        messagesHashes: hashes,
        shortenOrExtend,
        timestamp: hardcodedTimestamp,
      });
      const verificationData = `expire${shortenOrExtend}${hardcodedTimestamp}123${hashes.join('')}`;

      const func = async () => {
        return verifySig(ret, verificationData);
      };
      await expect(func()).to.be.rejectedWith('sig failed to be verified');
    });

    it('works with valid pubkey and privkey', async () => {
      Sinon.stub(UserUtils, 'getUserED25519KeyPair').resolves(userEd25519Keypair);

      const hashes = ['hash4321', 'hash4221'];
      const timestamp = hardcodedTimestamp;
      const shortenOrExtend = '';
      const ret = await SnodeSignature.generateUpdateExpiryOurSignature({
        messagesHashes: hashes,
        shortenOrExtend: '',
        timestamp,
      });

      expect(ret.pubkey).to.be.eq(userEd25519Keypair.pubKey);

      const verificationData = `expire${shortenOrExtend}${timestamp}${hashes.join('')}`;
      await verifySig(ret, verificationData);
    });
  });
});
