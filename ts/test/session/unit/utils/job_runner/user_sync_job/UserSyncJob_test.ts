import { expect } from 'chai';
import { PubkeyType } from 'libsession_util_nodejs';
import { omit } from 'lodash';
import Long from 'long';
import Sinon from 'sinon';
import { getSodiumNode } from '../../../../../../node/sodiumNode';
import { NotEmptyArrayOfBatchResults } from '../../../../../../session/apis/snode_api/SnodeRequestTypes';
import { GetNetworkTime } from '../../../../../../session/apis/snode_api/getNetworkTime';
import {
  SnodeNamespaces,
  SnodeNamespacesUserConfig,
} from '../../../../../../session/apis/snode_api/namespaces';
import { TTL_DEFAULT } from '../../../../../../session/constants';
import { ConvoHub } from '../../../../../../session/conversations';
import { LibSodiumWrappers } from '../../../../../../session/crypto';
import { MessageSender } from '../../../../../../session/sending';
import { UserUtils } from '../../../../../../session/utils';
import { RunJobResult } from '../../../../../../session/utils/job_runners/PersistedJob';
import { UserSync } from '../../../../../../session/utils/job_runners/jobs/UserSyncJob';
import {
  LibSessionUtil,
  PendingChangesForUs,
  UserDestinationChanges,
  UserSuccessfulChange,
} from '../../../../../../session/utils/libsession/libsession_utils';
import { GenericWrapperActions } from '../../../../../../webworker/workers/browser/libsession_worker_interface';
import { TestUtils } from '../../../../../test-utils';
import { TypedStub, stubConfigDumpData } from '../../../../../test-utils/utils';

function userChange(
  sodium: LibSodiumWrappers,
  namespace: SnodeNamespacesUserConfig,
  seqno: number
): PendingChangesForUs {
  return {
    ciphertext: sodium.randombytes_buf(120),
    namespace,
    seqno: Long.fromNumber(seqno),
  };
}

describe('UserSyncJob run()', () => {
  afterEach(() => {
    Sinon.restore();
  });
  it('throws if no user keys', async () => {
    const job = new UserSync.UserSyncJob({});

    const func = async () => job.run();
    await expect(func()).to.be.eventually.rejected;
  });

  it('throws if our pubkey is set but not valid', async () => {
    const job = new UserSync.UserSyncJob({});
    Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns({ something: false } as any);
    Sinon.stub(UserUtils, 'getUserED25519KeyPairBytes').resolves({ something: true } as any);
    Sinon.stub(ConvoHub.use(), 'get').resolves({}); // anything not falsy

    const func = async () => job.run();
    await expect(func()).to.be.eventually.rejected;
  });

  it('permanent failure if user has no ed keypair', async () => {
    Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns(TestUtils.generateFakePubKeyStr());
    Sinon.stub(UserUtils, 'getUserED25519KeyPairBytes').resolves(undefined);
    Sinon.stub(ConvoHub.use(), 'get').resolves({}); // anything not falsy
    const job = new UserSync.UserSyncJob({});
    const result = await job.run();
    expect(result).to.be.eq(RunJobResult.PermanentFailure);
  });

  it('permanent failure if user has no own conversation', async () => {
    Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns(TestUtils.generateFakePubKeyStr());
    Sinon.stub(UserUtils, 'getUserED25519KeyPairBytes').resolves({} as any); // anything not falsy
    Sinon.stub(ConvoHub.use(), 'get').returns(undefined as any);
    const job = new UserSync.UserSyncJob({});
    const result = await job.run();
    expect(result).to.be.eq(RunJobResult.PermanentFailure);
  });

  it('calls pushChangesToUserSwarmIfNeeded if preconditions are fine', async () => {
    Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns(TestUtils.generateFakePubKeyStr());
    Sinon.stub(UserUtils, 'getUserED25519KeyPairBytes').resolves({} as any); // anything not falsy
    const taskedRun = Sinon.stub(UserSync, 'pushChangesToUserSwarmIfNeeded').resolves(
      RunJobResult.Success
    );
    Sinon.stub(ConvoHub.use(), 'get').returns({} as any); // anything not falsy
    const job = new UserSync.UserSyncJob({});
    const result = await job.run();
    expect(result).to.be.eq(RunJobResult.Success);
    expect(taskedRun.callCount).to.be.eq(1);
  });
});

describe('UserSyncJob batchResultsToUserSuccessfulChange', () => {
  let sodium: LibSodiumWrappers;
  beforeEach(async () => {
    sodium = await getSodiumNode();
  });
  it('no or empty results return empty array', () => {
    expect(
      LibSessionUtil.batchResultsToUserSuccessfulChange(null, {
        allOldHashes: new Set(),
        messages: [],
      })
    ).to.be.deep.eq([]);

    expect(
      LibSessionUtil.batchResultsToUserSuccessfulChange([] as any as NotEmptyArrayOfBatchResults, {
        allOldHashes: new Set(),
        messages: [],
      })
    ).to.be.deep.eq([]);
  });

  it('extract one result with 200 and messagehash', () => {
    const profile = userChange(sodium, SnodeNamespaces.UserProfile, 321);
    const contact = userChange(sodium, SnodeNamespaces.UserContacts, 123);
    const batchResults: NotEmptyArrayOfBatchResults = [{ code: 200, body: { hash: 'hash1' } }];
    const request: UserDestinationChanges = {
      allOldHashes: new Set(),
      messages: [profile, contact],
    };
    const results = LibSessionUtil.batchResultsToUserSuccessfulChange(batchResults, request);
    expect(results).to.be.deep.eq([
      {
        updatedHash: 'hash1',
        pushed: profile,
      },
    ]);
  });

  it('extract two results with 200 and messagehash', () => {
    const profile = userChange(sodium, SnodeNamespaces.UserProfile, 321);
    const contact = userChange(sodium, SnodeNamespaces.UserContacts, 123);
    const batchResults: NotEmptyArrayOfBatchResults = [
      { code: 200, body: { hash: 'hash1' } },
      { code: 200, body: { hash: 'hash2' } },
    ];
    const request: UserDestinationChanges = {
      allOldHashes: new Set(),
      messages: [contact, profile],
    };
    const results = LibSessionUtil.batchResultsToUserSuccessfulChange(batchResults, request);
    expect(results).to.be.deep.eq([
      {
        updatedHash: 'hash1',
        pushed: contact,
      },
      {
        updatedHash: 'hash2',
        pushed: profile,
      },
    ]);
  });

  it('skip message hashes not a string', () => {
    const profile = userChange(sodium, SnodeNamespaces.UserProfile, 321);
    const contact = userChange(sodium, SnodeNamespaces.UserContacts, 123);
    const batchResults: NotEmptyArrayOfBatchResults = [
      { code: 200, body: { hash: 123 as any as string } },
      { code: 200, body: { hash: 'hash2' } },
    ];
    const request: UserDestinationChanges = {
      allOldHashes: new Set(),
      messages: [profile, contact],
    };
    const results = LibSessionUtil.batchResultsToUserSuccessfulChange(batchResults, request);
    expect(results).to.be.deep.eq([
      {
        updatedHash: 'hash2',
        pushed: contact,
      },
    ]);
  });

  it('skip request item without data', () => {
    const profile = userChange(sodium, SnodeNamespaces.UserProfile, 321);
    const contact = userChange(sodium, SnodeNamespaces.UserContacts, 123);
    const profileNoData = omit(profile, 'ciphertext');
    const batchResults: NotEmptyArrayOfBatchResults = [
      { code: 200, body: { hash: 'hash1' } },
      { code: 200, body: { hash: 'hash2' } },
    ];
    const request: UserDestinationChanges = {
      allOldHashes: new Set(),
      messages: [profileNoData as any as PendingChangesForUs, contact],
    };
    const results = LibSessionUtil.batchResultsToUserSuccessfulChange(batchResults, request);
    expect(results).to.be.deep.eq([
      {
        updatedHash: 'hash2',
        pushed: contact,
      },
    ]);
  });

  it('skip request item without 200 code', () => {
    const profile = userChange(sodium, SnodeNamespaces.UserProfile, 321);
    const contact = userChange(sodium, SnodeNamespaces.UserContacts, 123);
    const batchResults: NotEmptyArrayOfBatchResults = [
      { code: 200, body: { hash: 'hash1' } },
      { code: 401, body: { hash: 'hash2' } },
    ];
    const request: UserDestinationChanges = {
      allOldHashes: new Set(),
      messages: [profile, contact],
    };
    const results = LibSessionUtil.batchResultsToUserSuccessfulChange(batchResults, request);
    expect(results).to.be.deep.eq([
      {
        updatedHash: 'hash1',
        pushed: profile,
      },
    ]);

    // another test swapping the results
    batchResults[0].code = 401;
    batchResults[1].code = 200;
    const results2 = LibSessionUtil.batchResultsToUserSuccessfulChange(batchResults, request);
    expect(results2).to.be.deep.eq([
      {
        updatedHash: 'hash2',
        pushed: contact,
      },
    ]);
  });
});

describe('UserSyncJob pushChangesToUserSwarmIfNeeded', () => {
  let sessionId: PubkeyType;
  let userkeys: TestUtils.TestUserKeyPairs;
  let sodium: LibSodiumWrappers;

  let sendStub: TypedStub<typeof MessageSender, 'sendEncryptedDataToSnode'>;
  let pendingChangesForUsStub: TypedStub<typeof LibSessionUtil, 'pendingChangesForUs'>;
  let dump: TypedStub<typeof GenericWrapperActions, 'dump'>;

  beforeEach(async () => {
    sodium = await getSodiumNode();
    userkeys = await TestUtils.generateUserKeyPairs();
    sessionId = userkeys.x25519KeyPair.pubkeyHex;

    Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns(userkeys.x25519KeyPair.pubkeyHex);
    Sinon.stub(UserUtils, 'getUserED25519KeyPairBytes').resolves(userkeys.ed25519KeyPair);

    window.Whisper = {};
    window.Whisper.events = {};
    window.Whisper.events.trigger = Sinon.mock();
    stubConfigDumpData('saveConfigDump').resolves();

    pendingChangesForUsStub = Sinon.stub(LibSessionUtil, 'pendingChangesForUs');
    dump = Sinon.stub(GenericWrapperActions, 'dump').resolves(new Uint8Array());
    sendStub = Sinon.stub(MessageSender, 'sendEncryptedDataToSnode');
  });
  afterEach(() => {
    Sinon.restore();
  });

  it('call savesDumpToDb even if no changes are required on the serverside', async () => {
    Sinon.stub(GenericWrapperActions, 'needsDump').resolves(true);
    const result = await UserSync.pushChangesToUserSwarmIfNeeded();

    pendingChangesForUsStub.resolves(undefined);
    expect(result).to.be.eq(RunJobResult.Success);
    expect(sendStub.callCount).to.be.eq(0);
    expect(pendingChangesForUsStub.callCount).to.be.eq(1);
    expect(dump.callCount).to.be.eq(4);
    expect(dump.getCalls().map(m => m.args)).to.be.deep.eq([
      ['UserConfig'],
      ['ContactsConfig'],
      ['UserGroupsConfig'],
      ['ConvoInfoVolatileConfig'],
    ]);
  });

  it('calls sendEncryptedDataToSnode with the right data x2 and retry if network returned nothing', async () => {
    Sinon.stub(GenericWrapperActions, 'needsDump').resolves(false).onSecondCall().resolves(true);

    const profile = userChange(sodium, SnodeNamespaces.UserProfile, 321);
    const contact = userChange(sodium, SnodeNamespaces.UserContacts, 123);
    const networkTimestamp = 4444;
    const ttl = TTL_DEFAULT.CONFIG_MESSAGE;
    Sinon.stub(GetNetworkTime, 'now').returns(networkTimestamp);

    pendingChangesForUsStub.resolves({
      messages: [profile, contact],
      allOldHashes: new Set('123'),
    });
    const result = await UserSync.pushChangesToUserSwarmIfNeeded();

    sendStub.resolves(undefined);
    expect(result).to.be.eq(RunJobResult.RetryJobIfPossible); // not returning anything in the sendstub so network issue happened
    expect(sendStub.callCount).to.be.eq(1);
    expect(pendingChangesForUsStub.callCount).to.be.eq(1);
    expect(dump.callCount).to.be.eq(1);
    expect(dump.firstCall.args).to.be.deep.eq(['ContactsConfig']);

    function expected(details: any) {
      return {
        namespace: details.namespace,
        encryptedData: details.ciphertext,
        ttlMs: ttl,
        destination: sessionId,
        method: 'store',
      };
    }

    const expectedProfile = expected(profile);
    const expectedContact = expected(contact);

    const callArgs = sendStub.firstCall.args[0];
    // we don't want to check the content of the request in this unit test, just the structure/count of them
    const expectedArgs = {
      storeRequests: [expectedProfile, expectedContact],
      destination: sessionId,
      messagesHashesToDelete: new Set('123'),
    };
    // callArgs.storeRequests = callArgs.storeRequests.map(_m => null) as any;
    expect(callArgs).to.be.deep.eq(expectedArgs);
  });

  it('calls sendEncryptedDataToSnode with the right data x3 and retry if network returned nothing then success', async () => {
    const profile = userChange(sodium, SnodeNamespaces.UserProfile, 321);
    const contact = userChange(sodium, SnodeNamespaces.UserContacts, 123);
    const groups = userChange(sodium, SnodeNamespaces.UserGroups, 111);

    pendingChangesForUsStub.resolves({
      messages: [profile, contact, groups],
      allOldHashes: new Set('123'),
    });
    const changes: Array<UserSuccessfulChange> = [
      {
        pushed: profile,
        updatedHash: 'hashprofile',
      },
      {
        pushed: contact,
        updatedHash: 'hashcontact',
      },
      {
        pushed: groups,
        updatedHash: 'hashgroup',
      },
    ];
    Sinon.stub(LibSessionUtil, 'batchResultsToUserSuccessfulChange').returns(changes);
    const confirmPushed = Sinon.stub(GenericWrapperActions, 'confirmPushed').resolves();

    // all 4 need to be dumped
    const needsDump = Sinon.stub(GenericWrapperActions, 'needsDump').resolves(true);

    // ============ 1st try, let's say we didn't get as much entries in the result as expected. This should be a fail
    sendStub.resolves([
      { code: 200, body: { hash: 'hashprofile' } },
      { code: 200, body: { hash: 'hashcontact' } },
      { code: 200, body: { hash: 'hashgroup' } },
    ]);
    let result = await UserSync.pushChangesToUserSwarmIfNeeded();

    expect(sendStub.callCount).to.be.eq(1);
    expect(pendingChangesForUsStub.callCount).to.be.eq(1);
    expect(dump.getCalls().map(m => m.args)).to.be.deep.eq([
      ['UserConfig'],
      ['ContactsConfig'],
      ['UserGroupsConfig'],
      ['ConvoInfoVolatileConfig'],
    ]);
    expect(dump.callCount).to.be.eq(4);

    expect(needsDump.getCalls().map(m => m.args)).to.be.deep.eq([
      ['UserConfig'],
      ['ContactsConfig'],
      ['UserGroupsConfig'],
      ['ConvoInfoVolatileConfig'],
    ]);
    expect(needsDump.callCount).to.be.eq(4);

    expect(confirmPushed.callCount).to.be.eq(0); // first send failed, shouldn't confirm pushed
    expect(result).to.be.eq(RunJobResult.RetryJobIfPossible);

    // ============= second try: we now should get a success
    sendStub.resetHistory();
    sendStub.resolves([
      { code: 200, body: { hash: 'hashprofile2' } },
      { code: 200, body: { hash: 'hashcontact2' } },
      { code: 200, body: { hash: 'hashgroup2' } },
      { code: 200, body: {} }, // because we are giving a set of allOldHashes
    ]);
    changes.forEach(change => {
      // eslint-disable-next-line no-param-reassign
      change.updatedHash += '2';
    });

    pendingChangesForUsStub.resetHistory();
    dump.resetHistory();
    needsDump.resetHistory();
    confirmPushed.resetHistory();
    result = await UserSync.pushChangesToUserSwarmIfNeeded();

    expect(sendStub.callCount).to.be.eq(1);
    expect(pendingChangesForUsStub.callCount).to.be.eq(1);
    expect(dump.getCalls().map(m => m.args)).to.be.deep.eq([
      ['UserConfig'],
      ['ContactsConfig'],
      ['UserGroupsConfig'],
      ['ConvoInfoVolatileConfig'],
      ['UserConfig'],
      ['ContactsConfig'],
      ['UserGroupsConfig'],
      ['ConvoInfoVolatileConfig'],
    ]);

    expect(needsDump.getCalls().map(m => m.args)).to.be.deep.eq([
      ['UserConfig'],
      ['ContactsConfig'],
      ['UserGroupsConfig'],
      ['ConvoInfoVolatileConfig'],
      ['UserConfig'],
      ['ContactsConfig'],
      ['UserGroupsConfig'],
      ['ConvoInfoVolatileConfig'],
    ]);

    expect(confirmPushed.getCalls().map(m => m.args)).to.be.deep.eq([
      ['UserConfig', 321, 'hashprofile2'],
      ['ContactsConfig', 123, 'hashcontact2'],
      ['UserGroupsConfig', 111, 'hashgroup2'],
    ]);
    expect(confirmPushed.callCount).to.be.eq(3); // second send success, we should confirm the pushes of the 3 pushed messages

    expect(result).to.be.eq(RunJobResult.Success);
  });
});
