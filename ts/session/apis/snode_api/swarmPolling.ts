/* eslint-disable no-await-in-loop */
/* eslint-disable more/no-then */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { GroupPubkeyType } from 'libsession_util_nodejs';
import { compact, concat, difference, flatten, isArray, last, sample, uniqBy } from 'lodash';
import { v4 } from 'uuid';
import { Data, Snode } from '../../../data/data';
import { SignalService } from '../../../protobuf';
import * as Receiver from '../../../receiver/receiver';
import { PubKey } from '../../types';
import { ERROR_CODE_NO_CONNECT } from './SNodeAPI';
import * as snodePool from './snodePool';

import { ConversationModel } from '../../../models/conversation';
import { ConversationTypeEnum } from '../../../models/conversationAttributes';
import { signalservice } from '../../../protobuf/compiled';
import { EnvelopePlus } from '../../../receiver/types';
import { updateIsOnline } from '../../../state/ducks/onion';
import { assertUnreachable } from '../../../types/sqlSharedTypes';
import {
  GenericWrapperActions,
  MetaGroupWrapperActions,
  UserGroupsWrapperActions,
} from '../../../webworker/workers/browser/libsession_worker_interface';
import { DURATION, SWARM_POLLING_TIMEOUT } from '../../constants';
import { ConvoHub } from '../../conversations';
import { ed25519Str } from '../../onions/onionPath';
import { StringUtils, UserUtils } from '../../utils';
import { perfEnd, perfStart } from '../../utils/Performance';
import { PreConditionFailed } from '../../utils/errors';
import { LibSessionUtil } from '../../utils/libsession/libsession_utils';
import { SnodeNamespace, SnodeNamespaces, UserConfigNamespaces } from './namespaces';
import { PollForGroup, PollForLegacy, PollForUs } from './pollingTypes';
import { SnodeAPIRetrieve } from './retrieveRequest';
import { SwarmPollingGroupConfig } from './swarm_polling_config/SwarmPollingGroupConfig';
import { SwarmPollingUserConfig } from './swarm_polling_config/SwarmPollingUserConfig';
import {
  RetrieveMessageItem,
  RetrieveMessageItemWithNamespace,
  RetrieveMessagesResultsBatched,
  RetrieveRequestResult,
} from './types';

const minMsgCountShouldRetry = 95;

export function extractWebSocketContent(message: string): null | Uint8Array {
  try {
    const dataPlaintext = new Uint8Array(StringUtils.encode(message, 'base64'));
    const messageBuf = SignalService.WebSocketMessage.decode(dataPlaintext);
    if (
      messageBuf.type === SignalService.WebSocketMessage.Type.REQUEST &&
      messageBuf.request?.body?.length
    ) {
      return messageBuf.request.body;
    }

    return null;
  } catch (error) {
    window?.log?.warn('extractWebSocketContent from message failed with:', error.message);
    return null;
  }
}

let instance: SwarmPolling | undefined;
export const getSwarmPollingInstance = () => {
  if (!instance) {
    instance = new SwarmPolling();
  }
  return instance;
};

type GroupPollingEntry = { pubkey: PubKey; lastPolledTimestamp: number };

function entryToKey(entry: GroupPollingEntry) {
  return entry.pubkey.key;
}

export class SwarmPolling {
  private groupPolling: Array<GroupPollingEntry>;

  /**
   * lastHashes[snode_edkey][pubkey_polled][namespace_polled] = last_hash
   */
  private readonly lastHashes: Record<string, Record<string, Record<number, string>>>;
  private hasStarted = false;

  constructor() {
    this.groupPolling = [];
    this.lastHashes = {};
  }

  public async start(waitForFirstPoll = false): Promise<void> {
    // when restoring from seed we have to start polling before we get on the mainPage, hence this check here to make sure we do not start twice
    if (this.hasStarted) {
      return;
    }
    this.hasStarted = true;
    this.loadGroupIds();
    if (waitForFirstPoll) {
      await this.pollForAllKeys();
    } else {
      setTimeout(() => {
        void this.pollForAllKeys();
      }, 4000);
    }
  }

  /**
   * Used for testing only
   */
  public resetSwarmPolling() {
    this.groupPolling = [];
    this.hasStarted = false;
  }

  public forcePolledTimestamp(pubkey: string, lastPoll: number) {
    const foundAt = this.groupPolling.findIndex(group => {
      return PubKey.isEqual(pubkey, group.pubkey);
    });

    if (foundAt > -1) {
      this.groupPolling[foundAt].lastPolledTimestamp = lastPoll;
    }
  }

  public addGroupId(pubkey: PubKey | string) {
    const pk = PubKey.cast(pubkey);
    if (this.groupPolling.findIndex(m => m.pubkey.key === pk.key) === -1) {
      window?.log?.info('Swarm addGroupId: adding pubkey to polling', pk.key);
      this.groupPolling.push({ pubkey: pk, lastPolledTimestamp: 0 });
    }
  }

  public removePubkey(pk: PubKey | string, reason: string) {
    const pubkey = PubKey.cast(pk);
    if (this.groupPolling.some(group => pubkey.key === group.pubkey.key)) {
      window?.log?.info(`SwarmPolling: removing ${ed25519Str(pubkey.key)} for reason: "${reason}"`);
      this.groupPolling = this.groupPolling.filter(group => !pubkey.isEqual(group.pubkey));
    }
  }

  /**
   * Only public for testing purpose.
   *
   * Currently, a group with an
   *  -> an activeAt less than 2 days old is considered active and polled often (every 5 sec)
   *  -> an activeAt less than 1 week old is considered medium_active and polled a bit less (every minute)
   *  -> an activeAt more than a week old is considered inactive, and not polled much (every 2 minutes)
   */
  public getPollingTimeout(convoId: PubKey) {
    const convo = ConvoHub.use().get(convoId.key);
    if (!convo) {
      return SWARM_POLLING_TIMEOUT.INACTIVE;
    }
    const activeAt = convo.getActiveAt();
    if (!activeAt) {
      return SWARM_POLLING_TIMEOUT.INACTIVE;
    }

    const currentTimestamp = Date.now();
    const diff = currentTimestamp - activeAt;

    // consider that this is an active group if activeAt is less than two days old
    if (diff <= DURATION.DAYS * 2) {
      return SWARM_POLLING_TIMEOUT.ACTIVE;
    }

    if (diff <= DURATION.DAYS * 7) {
      return SWARM_POLLING_TIMEOUT.MEDIUM_ACTIVE;
    }
    return SWARM_POLLING_TIMEOUT.INACTIVE;
  }

  public shouldPollByTimeout(entry: GroupPollingEntry) {
    const convoPollingTimeout = this.getPollingTimeout(entry.pubkey);
    const diff = Date.now() - entry.lastPolledTimestamp;
    return diff >= convoPollingTimeout;
  }

  public async getPollingDetails(pollingEntries: Array<GroupPollingEntry>) {
    let toPollDetails: Array<PollForUs | PollForLegacy | PollForGroup> = [];
    const ourPubkey = UserUtils.getOurPubKeyStrFromCache();

    if (pollingEntries.some(m => m.pubkey.key === ourPubkey)) {
      throw new Error(
        'pollingEntries should only contain group swarm (legacy or not), but not ourself'
      );
    }

    // First, make sure we do poll for our own swarm. Note: we always poll as often as possible for our swarm
    toPollDetails.push([ourPubkey, ConversationTypeEnum.PRIVATE]);

    const allGroupsLegacyInWrapper = await UserGroupsWrapperActions.getAllLegacyGroups();
    const allGroupsInWrapper = await UserGroupsWrapperActions.getAllGroups();
    if (!isArray(allGroupsLegacyInWrapper) || !isArray(allGroupsInWrapper)) {
      throw new Error('getAllLegacyGroups or getAllGroups returned unknown result');
    }

    // only groups NOT starting with 03
    const legacyGroups = pollingEntries.filter(m => !PubKey.isClosedGroupV2(m.pubkey.key));

    // only groups starting with 03
    const groups = pollingEntries.filter(m => PubKey.isClosedGroupV2(m.pubkey.key));

    // let's grab the groups and legacy groups which should be left as they are not in their corresponding wrapper
    const legacyGroupsToLeave = legacyGroups
      .filter(m => !allGroupsLegacyInWrapper.some(w => w.pubkeyHex === m.pubkey.key))
      .map(entryToKey);
    const groupsToLeave = groups
      .filter(m => !allGroupsInWrapper.some(w => w.pubkeyHex === m.pubkey.key))
      .map(entryToKey);

    const allLegacyGroupsTracked = legacyGroups
      .filter(m => this.shouldPollByTimeout(m)) // should we poll from it depending on this group activity?
      .filter(m => allGroupsLegacyInWrapper.some(w => w.pubkeyHex === m.pubkey.key)) // we don't poll from legacygroups which are not in the usergroup wrapper
      .map(m => m.pubkey.key) // extract the pubkey
      .map(m => [m, ConversationTypeEnum.GROUP] as PollForLegacy); //
    toPollDetails = concat(toPollDetails, allLegacyGroupsTracked);

    const allGroupsTracked = groups
      .filter(m => this.shouldPollByTimeout(m)) // should we poll from it depending on this group activity?
      .filter(m => allGroupsInWrapper.some(w => w.pubkeyHex === m.pubkey.key)) // we don't poll from groups which are not in the usergroup wrapper
      .map(m => m.pubkey.key as GroupPubkeyType) // extract the pubkey
      .map(m => [m, ConversationTypeEnum.GROUPV2] as PollForGroup);

    toPollDetails = concat(toPollDetails, allGroupsTracked);

    return { toPollDetails, legacyGroupsToLeave, groupsToLeave };
  }

  /**
   * Only public for testing
   */
  public async pollForAllKeys() {
    if (!window.getGlobalOnlineStatus()) {
      window?.log?.error('pollForAllKeys: offline');
      // Very important to set up a new polling call so we do retry at some point
      setTimeout(this.pollForAllKeys.bind(this), SWARM_POLLING_TIMEOUT.ACTIVE);
      return;
    }

    const { toPollDetails, groupsToLeave, legacyGroupsToLeave } = await this.getPollingDetails(
      this.groupPolling
    );
    // first, leave anything which shouldn't be there anymore
    await Promise.all(
      concat(groupsToLeave, legacyGroupsToLeave).map(m =>
        this.notPollingForGroupAsNotInWrapper(m, 'not in wrapper before poll')
      )
    );

    try {
      await Promise.all(toPollDetails.map(toPoll => this.pollOnceForKey(toPoll)));
    } catch (e) {
      window?.log?.warn('pollForAllKeys exception: ', e);
      throw e;
    } finally {
      setTimeout(this.pollForAllKeys.bind(this), SWARM_POLLING_TIMEOUT.ACTIVE);
    }
  }

  public async updateLastPollTimestampForPubkey({
    countMessages,
    pubkey,
    type,
  }: {
    type: ConversationTypeEnum;
    countMessages: number;
    pubkey: string;
  }) {
    // if all snodes returned an error (null), no need to update the lastPolledTimestamp
    if (type === ConversationTypeEnum.GROUP || type === ConversationTypeEnum.GROUPV2) {
      window?.log?.debug(
        `Polled for group(${ed25519Str(pubkey)}):, got ${countMessages} messages back.`
      );
      let lastPolledTimestamp = Date.now();
      if (countMessages >= minMsgCountShouldRetry) {
        // if we get `minMsgCountShouldRetry` messages or more back, it means there are probably more than this
        // so make sure to retry the polling in the next 5sec by marking the last polled timestamp way before that it is really
        // this is a kind of hack
        lastPolledTimestamp = Date.now() - SWARM_POLLING_TIMEOUT.INACTIVE - 5 * 1000;
      } // update the last fetched timestamp

      this.forcePolledTimestamp(pubkey, lastPolledTimestamp);
    }
  }

  public async handleUserOrGroupConfMessages({
    confMessages,
    pubkey,
    type,
  }: {
    type: ConversationTypeEnum;
    pubkey: string;
    confMessages: Array<RetrieveMessageItemWithNamespace> | null;
  }) {
    if (!confMessages) {
      return;
    }

    // first make sure to handle the shared user config message first
    if (type === ConversationTypeEnum.PRIVATE && UserUtils.isUsFromCache(pubkey)) {
      // this does not throw, no matter what happens
      await SwarmPollingUserConfig.handleUserSharedConfigMessages(confMessages);
      return;
    }
    if (type === ConversationTypeEnum.GROUPV2 && PubKey.isClosedGroupV2(pubkey)) {
      await SwarmPollingGroupConfig.handleGroupSharedConfigMessages(confMessages, pubkey);
    }
  }

  /**
   * Only exposed as public for testing
   */
  public async pollOnceForKey([pubkey, type]: PollForUs | PollForLegacy | PollForGroup) {
    const namespaces = this.getNamespacesToPollFrom(type);
    const swarmSnodes = await snodePool.getSwarmFor(pubkey);

    // Select nodes for which we already have lastHashes
    const alreadyPolled = swarmSnodes.filter((n: Snode) => this.lastHashes[n.pubkey_ed25519]);
    let toPollFrom = alreadyPolled.length ? alreadyPolled[0] : null;

    // If we need more nodes, select randomly from the remaining nodes:
    if (!toPollFrom) {
      const notPolled = difference(swarmSnodes, alreadyPolled);
      toPollFrom = sample(notPolled) as Snode;
    }

    let resultsFromAllNamespaces: RetrieveMessagesResultsBatched | null;
    try {
      resultsFromAllNamespaces = await this.pollNodeForKey(toPollFrom, pubkey, namespaces, type);
    } catch (e) {
      window.log.warn(
        `pollNodeForKey of ${pubkey} namespaces: ${namespaces} failed with: ${e.message}`
      );
      resultsFromAllNamespaces = null;
    }

    if (!resultsFromAllNamespaces?.length) {
      // Not a single message from any of the polled namespace was retrieved.
      // We must still mark the current pubkey as "was just polled"
      await this.updateLastPollTimestampForPubkey({
        countMessages: 0,
        pubkey,
        type,
      });
      return;
    }
    const { confMessages, otherMessages } = filterMessagesPerTypeOfConvo(
      type,
      resultsFromAllNamespaces
    );
    // We always handle the config messages first (for groups 03 or our own messages)
    await this.handleUserOrGroupConfMessages({ confMessages, pubkey, type });

    // Merge results into one list of unique messages
    const uniqOtherMsgs = uniqBy(otherMessages, x => x.hash);
    if (uniqOtherMsgs.length) {
      window.log.debug(`received otherMessages: ${otherMessages.length} for type: ${type}`);
    }
    await this.updateLastPollTimestampForPubkey({
      countMessages: uniqOtherMsgs.length,
      pubkey,
      type,
    });

    const shouldDiscardMessages = await this.shouldLeaveNotPolledGroup({ type, pubkey });
    if (shouldDiscardMessages) {
      return;
    }

    perfStart(`handleSeenMessages-${pubkey}`);
    const newMessages = await this.handleSeenMessages(uniqOtherMsgs);
    perfEnd(`handleSeenMessages-${pubkey}`, 'handleSeenMessages');
    if (type === ConversationTypeEnum.GROUPV2) {
      for (let index = 0; index < newMessages.length; index++) {
        const msg = newMessages[index];
        const retrieveResult = new Uint8Array(StringUtils.encode(msg.data, 'base64'));
        try {
          const envelopePlus = await decryptForGroupV2({
            content: retrieveResult,
            groupPk: pubkey,
            sentTimestamp: msg.timestamp,
          });
          if (!envelopePlus) {
            throw new Error('decryptForGroupV2 returned empty envelope');
          }

          // this is the processing of the message itself, which can be long.
          Receiver.handleRequest(envelopePlus.content, envelopePlus.source, msg.hash);
        } catch (e) {
          window.log.warn('failed to handle groupv2 otherMessage because of: ', e.message);
        }
      }
      return;
    }

    // trigger the handling of all the other messages, not shared config related
    newMessages.forEach(m => {
      const content = extractWebSocketContent(m.data);

      if (!content) {
        return;
      }

      Receiver.handleRequest(content, type === ConversationTypeEnum.GROUP ? pubkey : null, m.hash);
    });
  }

  private async shouldLeaveNotPolledGroup({
    pubkey,
    type,
  }: {
    type: ConversationTypeEnum;
    pubkey: string;
  }) {
    const allLegacyGroupsInWrapper = await UserGroupsWrapperActions.getAllLegacyGroups();
    const allGroupsInWrapper = await UserGroupsWrapperActions.getAllGroups();

    // don't handle incoming messages from group when the group is not tracked.
    // this can happen when a group is removed from the wrapper while we were polling

    const newGroupButNotInWrapper =
      PubKey.isClosedGroupV2(pubkey) && !allGroupsInWrapper.some(m => m.pubkeyHex === pubkey);
    const legacyGroupButNoInWrapper =
      type === ConversationTypeEnum.GROUP &&
      pubkey.startsWith('05') &&
      !allLegacyGroupsInWrapper.some(m => m.pubkeyHex === pubkey);

    if (newGroupButNotInWrapper || legacyGroupButNoInWrapper) {
      // not tracked anymore in the wrapper. Discard messages and stop polling
      await this.notPollingForGroupAsNotInWrapper(pubkey, 'not in wrapper after poll');
      return true;
    }
    return false;
  }

  private async getHashesToBump(
    type: ConversationTypeEnum,
    pubkey: string
  ): Promise<Array<string>> {
    if (type === ConversationTypeEnum.PRIVATE) {
      const configHashesToBump: Array<string> = [];
      for (let index = 0; index < LibSessionUtil.requiredUserVariants.length; index++) {
        const variant = LibSessionUtil.requiredUserVariants[index];
        try {
          const toBump = await GenericWrapperActions.currentHashes(variant);

          if (toBump?.length) {
            configHashesToBump.push(...toBump);
          }
        } catch (e) {
          window.log.warn(`failed to get currentHashes for user variant ${variant}`);
        }
      }
      window.log.debug(`configHashesToBump private: ${configHashesToBump}`);
      return configHashesToBump;
    }
    if (type === ConversationTypeEnum.GROUPV2 && PubKey.isClosedGroupV2(pubkey)) {
      const toBump = await MetaGroupWrapperActions.currentHashes(pubkey);
      window.log.debug(`configHashesToBump group: ${toBump}`);
      return toBump;
    }
    return [];
  }

  // Fetches messages for `pubkey` from `node` potentially updating
  // the lash hash record
  private async pollNodeForKey(
    node: Snode,
    pubkey: string,
    namespaces: Array<SnodeNamespaces>,
    type: ConversationTypeEnum
  ): Promise<RetrieveMessagesResultsBatched | null> {
    const namespaceLength = namespaces.length;
    if (namespaceLength <= 0) {
      throw new Error(`invalid number of retrieve namespace provided: ${namespaceLength}`);
    }
    const snodeEdkey = node.pubkey_ed25519;

    try {
      const prevHashes = await Promise.all(
        namespaces.map(namespace => this.getLastHash(snodeEdkey, pubkey, namespace))
      );
      const configHashesToBump = await this.getHashesToBump(type, pubkey);

      let results = await SnodeAPIRetrieve.retrieveNextMessages(
        node,
        prevHashes,
        pubkey,
        namespaces,
        UserUtils.getOurPubKeyStrFromCache(),
        configHashesToBump
      );

      if (!results.length) {
        return [];
      }
      // when we asked to extend the expiry of the config messages, exclude it from the list of results as we do not want to mess up the last hash tracking logic
      if (configHashesToBump.length) {
        try {
          const lastResult = results[results.length - 1];
          if (lastResult?.code !== 200) {
            // the update expiry of our config messages didn't work.
            window.log.warn(
              `the update expiry of our tracked config hashes didn't work: ${JSON.stringify(
                lastResult
              )}`
            );
          }
        } catch (e) {
          // nothing to do I suppose here.
        }
        results = results.slice(0, results.length - 1);
      }

      const lastMessages = results.map(r => {
        return last(r.messages.messages);
      });

      await Promise.all(
        lastMessages.map(async (lastMessage, index) => {
          if (!lastMessage) {
            return undefined;
          }
          return this.updateLastHash({
            edkey: snodeEdkey,
            pubkey,
            namespace: namespaces[index],
            hash: lastMessage.hash,
            expiration: lastMessage.expiration,
          });
        })
      );

      return results;
    } catch (e) {
      if (e.message === ERROR_CODE_NO_CONNECT) {
        if (window.inboxStore?.getState().onionPaths.isOnline) {
          window.inboxStore?.dispatch(updateIsOnline(false));
        }
      } else if (!window.inboxStore?.getState().onionPaths.isOnline) {
        window.inboxStore?.dispatch(updateIsOnline(true));
      }
      window?.log?.info('pollNodeForKey failed with:', e.message);
      return null;
    }
  }

  private async notPollingForGroupAsNotInWrapper(pubkey: string, reason: string) {
    window.log.debug(
      `notPollingForGroupAsNotInWrapper ${ed25519Str(pubkey)} with reason:"${reason}"`
    );
    await ConvoHub.use().deleteClosedGroup(pubkey, {
      fromSyncMessage: true,
      sendLeaveMessage: false,
    });
    return Promise.resolve();
  }

  private loadGroupIds() {
    const convos = ConvoHub.use().getConversations();

    const closedGroupsOnly = convos.filter(
      (c: ConversationModel) =>
        c.isClosedGroup() && !c.isBlocked() && !c.isKickedFromGroup() && !c.wasLeft()
    );

    closedGroupsOnly.forEach(c => {
      this.addGroupId(new PubKey(c.id));
    });
  }

  private async handleSeenMessages(
    messages: Array<RetrieveMessageItem>
  ): Promise<Array<RetrieveMessageItem>> {
    if (!messages.length) {
      return [];
    }

    const incomingHashes = messages.map((m: RetrieveMessageItem) => m.hash);

    const dupHashes = await Data.getSeenMessagesByHashList(incomingHashes);
    const newMessages = messages.filter((m: RetrieveMessageItem) => !dupHashes.includes(m.hash));

    if (newMessages.length) {
      const newHashes = newMessages.map((m: RetrieveMessageItem) => ({
        expiresAt: m.expiration,
        hash: m.hash,
      }));
      await Data.saveSeenMessageHashes(newHashes);
    }
    return newMessages;
  }

  // eslint-disable-next-line consistent-return
  public getNamespacesToPollFrom(type: ConversationTypeEnum) {
    if (type === ConversationTypeEnum.PRIVATE) {
      const toRet: Array<UserConfigNamespaces | SnodeNamespaces.Default> = [
        SnodeNamespaces.Default,
        SnodeNamespaces.UserProfile,
        SnodeNamespaces.UserContacts,
        SnodeNamespaces.UserGroups,
        SnodeNamespaces.ConvoInfoVolatile,
      ];
      return toRet;
    }
    if (type === ConversationTypeEnum.GROUP) {
      return [SnodeNamespaces.LegacyClosedGroup];
    }
    if (type === ConversationTypeEnum.GROUPV2) {
      return [
        SnodeNamespaces.ClosedGroupMessages,
        SnodeNamespaces.ClosedGroupInfo,
        SnodeNamespaces.ClosedGroupMembers,
        SnodeNamespaces.ClosedGroupKeys, // keys are fetched last to avoid race conditions when someone deposits them
      ];
    }
    assertUnreachable(
      type,
      `getNamespacesToPollFrom case should have been unreachable: type:${type}`
    );
  }

  private async updateLastHash({
    edkey,
    expiration,
    hash,
    namespace,
    pubkey,
  }: {
    edkey: string;
    pubkey: string;
    namespace: number;
    hash: string;
    expiration: number;
  }): Promise<void> {
    const cached = await this.getLastHash(edkey, pubkey, namespace);

    if (!cached || cached !== hash) {
      await Data.updateLastHash({
        convoId: pubkey,
        snode: edkey,
        hash,
        expiresAt: expiration,
        namespace,
      });
    }

    if (!this.lastHashes[edkey]) {
      this.lastHashes[edkey] = {};
    }
    if (!this.lastHashes[edkey][pubkey]) {
      this.lastHashes[edkey][pubkey] = {};
    }
    this.lastHashes[edkey][pubkey][namespace] = hash;
  }

  private async getLastHash(nodeEdKey: string, pubkey: string, namespace: number): Promise<string> {
    if (!this.lastHashes[nodeEdKey]?.[pubkey]?.[namespace]) {
      const lastHash = await Data.getLastHashBySnode(pubkey, nodeEdKey, namespace);

      if (!this.lastHashes[nodeEdKey]) {
        this.lastHashes[nodeEdKey] = {};
      }

      if (!this.lastHashes[nodeEdKey][pubkey]) {
        this.lastHashes[nodeEdKey][pubkey] = {};
      }
      this.lastHashes[nodeEdKey][pubkey][namespace] = lastHash || '';
      return this.lastHashes[nodeEdKey][pubkey][namespace];
    }
    // return the cached value
    return this.lastHashes[nodeEdKey][pubkey][namespace];
  }
}

function retrieveItemWithNamespace(results: Array<RetrieveRequestResult>) {
  return flatten(
    compact(
      results.map(result =>
        result.messages.messages?.map(r => ({ ...r, namespace: result.namespace }))
      )
    )
  );
}

function filterMessagesPerTypeOfConvo<T extends ConversationTypeEnum>(
  type: T,
  retrieveResults: RetrieveMessagesResultsBatched
): {
  confMessages: Array<RetrieveMessageItemWithNamespace> | null;
  otherMessages: Array<RetrieveMessageItemWithNamespace>;
} {
  switch (type) {
    case ConversationTypeEnum.PRIVATE: {
      const userConfs = retrieveResults.filter(m =>
        SnodeNamespace.isUserConfigNamespace(m.namespace)
      );
      const userOthers = retrieveResults.filter(
        m => !SnodeNamespace.isUserConfigNamespace(m.namespace)
      );

      const confMessages = retrieveItemWithNamespace(userConfs);

      const otherMessages = retrieveItemWithNamespace(userOthers);

      return { confMessages, otherMessages: uniqBy(otherMessages, x => x.hash) };
    }

    case ConversationTypeEnum.GROUP:
      return {
        confMessages: null,
        otherMessages: retrieveItemWithNamespace(retrieveResults),
      };

    case ConversationTypeEnum.GROUPV2: {
      const groupConfs = retrieveResults.filter(m =>
        SnodeNamespace.isGroupConfigNamespace(m.namespace)
      );
      const groupOthers = retrieveResults.filter(
        m => !SnodeNamespace.isGroupConfigNamespace(m.namespace)
      );

      const groupConfMessages = retrieveItemWithNamespace(groupConfs);

      const groupOtherMessages = retrieveItemWithNamespace(groupOthers);

      return {
        confMessages: groupConfMessages,
        otherMessages: uniqBy(groupOtherMessages, x => x.hash),
      };
    }

    default:
      return { confMessages: null, otherMessages: [] };
  }
}

async function decryptForGroupV2(retrieveResult: {
  groupPk: string;
  content: Uint8Array;
  sentTimestamp: number;
}): Promise<EnvelopePlus | null> {
  window?.log?.info('received closed group message v2');
  try {
    const groupPk = retrieveResult.groupPk;
    if (!PubKey.isClosedGroupV2(groupPk)) {
      throw new PreConditionFailed('decryptForGroupV2: not a 03 prefixed group');
    }

    const decrypted = await MetaGroupWrapperActions.decryptMessage(groupPk, retrieveResult.content);
    const envelopePlus: EnvelopePlus = {
      id: v4(),
      senderIdentity: decrypted.pubkeyHex,
      receivedAt: Date.now(),
      content: decrypted.plaintext,
      source: groupPk,
      type: signalservice.Envelope.Type.CLOSED_GROUP_MESSAGE,
      timestamp: retrieveResult.sentTimestamp,
    };
    // the receiving pipeline relies on the envelope.senderIdentity field to know who is the author of a message

    return envelopePlus;
  } catch (e) {
    window.log.warn('failed to decrypt message with error: ', e.message);
    return null;
  }
}
