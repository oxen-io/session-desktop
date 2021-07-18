import { PubKey } from '../types';
import * as snodePool from './snodePool';
import { retrieveNextMessages } from './SNodeAPI';
import { SignalService } from '../../protobuf';
import * as Receiver from '../../receiver/receiver';
import _ from 'lodash';
import {
  getLastHashBySnode,
  getSeenMessagesByHashList,
  saveSeenMessageHashes,
  Snode,
  updateLastHash,
} from '../../../ts/data/data';

import { StringUtils, UserUtils } from '../../session/utils';
import { ConversationModel } from '../../models/conversation';
import { DURATION, SWARM_POLLING_ACTIVITY, SWARM_POLLING_TIMEOUT } from '../constants';
import { getConversationController } from '../conversations';

type PubkeyToHash = { [key: string]: string };

interface Message {
  hash: string;
  expiration: number;
  data: string;
}

// Some websocket nonsense
export function processMessage(message: string, options: any = {}) {
  try {
    const dataPlaintext = new Uint8Array(StringUtils.encode(message, 'base64'));
    const messageBuf = SignalService.WebSocketMessage.decode(dataPlaintext);
    if (messageBuf.type === SignalService.WebSocketMessage.Type.REQUEST) {
      Receiver.handleRequest(messageBuf.request?.body, options);
    }
  } catch (error) {
    const info = {
      message,
      error: error.message,
    };
    window?.log?.warn('HTTP-Resources Failed to handle message:', info);
  }
}

/**
 * Converts a message into an array buffer
 * @param message Message to be converted
 * @returns Array buffer
 */
export const messageToWebsocketMessage = (message: string) => {
  const dataPlaintext = new Uint8Array(StringUtils.encode(message, 'base64'));
  const messageBuf = SignalService.WebSocketMessage.decode(dataPlaintext);
  return messageBuf;
}

/**
 * Converts an array of messages into an array of array buffers
 * @param messages List of messages
 * @returns List of array buffers
 */
export const messagesToArrayBuffers = (messages: Message[]): Array<Uint8Array> => {
  const messageBodies: Array<Uint8Array> = [];
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    const wMessage = messageToWebsocketMessage(message.data);
    const body = wMessage.request?.body;
    if (body) {
      messageBodies.push(body);
    }
  }
  return messageBodies;
}

export const processMessages = (messages: Array<Message>, options: any) => {
  let messageBodies = messagesToArrayBuffers(messages);
  Receiver.handleBatchRequest(messageBodies, options);
}

let instance: SwarmPolling | undefined;
export const getSwarmPollingInstance = () => {
  if (!instance) {
    instance = new SwarmPolling();
  }
  return instance;
};

export class SwarmPolling {
  private groupPolling: Array<{ pubkey: PubKey; lastPolledTimestamp: number }>;
  private readonly lastHashes: { [key: string]: PubkeyToHash };
  private groupPollsSinceActive: { [key: string]: number };

  constructor() {
    this.groupPolling = [];
    this.lastHashes = {};
    this.groupPollsSinceActive = {};
  }

  public async start(waitForFirstPoll = false): Promise<void> {
    this.loadGroupIds();
    if (waitForFirstPoll) {
      await this.TEST_pollForAllKeys();
    } else {
      void this.TEST_pollForAllKeys();
    }
  }

  /**
   * Used fo testing only
   */
  public TEST_reset() {
    this.groupPolling = [];
  }

  public addGroupId(pubkey: PubKey) {
    if (this.groupPolling.findIndex(m => m.pubkey.key === pubkey.key) === -1) {
      window?.log?.info('Swarm addGroupId: adding pubkey to polling', pubkey.key);
      this.groupPolling.push({ pubkey, lastPolledTimestamp: 0 });
    }
  }

  public removePubkey(pk: PubKey | string) {
    const pubkey = PubKey.cast(pk);
    window?.log?.info('Swarm removePubkey: removing pubkey from polling', pubkey.key);
    this.groupPolling = this.groupPolling.filter(group => !pubkey.isEqual(group.pubkey));
  }

  /**
   * Only public for testing
   * As of today, we pull closed group pubkeys as follow:
   * if activeAt is not set, poll only once per hour
   * if activeAt is less than an hour old, poll every 5 seconds or so
   * if activeAt is less than a day old, poll every minutes only.
   * If activeAt is more than a day old, poll only once per hour
   */
  public TEST_getPollingTimeout(convoId: PubKey) {
    const convo = getConversationController().get(convoId.key);
    if (!convo) {
      return SWARM_POLLING_TIMEOUT.INACTIVE;
    }
    const activeAt = convo.get('active_at');
    if (!activeAt) {
      return SWARM_POLLING_TIMEOUT.INACTIVE;
    }

    const currentTimestamp = Date.now();

    const lastActive = currentTimestamp - activeAt;
    // Handle case to load when a user is updating on a lot of messages
    if (lastActive < SWARM_POLLING_ACTIVITY.MOST_ACTIVE) {
      return SWARM_POLLING_TIMEOUT.MOST_ACTIVE;
    }
    // consider that this is an active group if activeAt is less than an hour old
    if (lastActive <= SWARM_POLLING_ACTIVITY.ACTIVE) {
      return SWARM_POLLING_TIMEOUT.ACTIVE;
    }
    if (lastActive <= SWARM_POLLING_ACTIVITY.MEDIUM_ACTIVE) {
      return SWARM_POLLING_TIMEOUT.MEDIUM_ACTIVE;
    }
    return SWARM_POLLING_TIMEOUT.INACTIVE;
  }

  /**
   * Only public for testing
   */
  public async TEST_pollForAllKeys(repollIds?: Array<string>): Promise<boolean | void> {
    // we always poll as often as possible for our pubkey

    const getLoggingId = (group: { pubkey: PubKey }) => {
      return getConversationController()
        .get(group.pubkey.key)
        ?.idForLogging() || group.pubkey.key;
    }

    const ourPubkey = UserUtils.getOurPubKeyFromCache();
    const directPromise = this.TEST_pollOnceForKey(ourPubkey, false);
    let nextPollTimeout = SWARM_POLLING_TIMEOUT.ACTIVE;
    const idsToRepoll: Array<string> = [];

    const now = Date.now();
    const groupPromises = this.groupPolling.map(async (group, index: number) => {
      const convoPollingTimeout = this.TEST_getPollingTimeout(group.pubkey);
      // const convoPollingTimeout = 500;
      this.loadGroupIds();

      const diff = now - group.lastPolledTimestamp;
      const loggingId = getLoggingId(group);

      if (diff >= convoPollingTimeout || this.groupPollsSinceActive[loggingId] <= 15) {
        (window?.log?.info || console.warn)(
          `Polling for ${loggingId}; timeout: ${convoPollingTimeout} ; diff: ${diff}`
        );
        return this.TEST_pollOnceForKey(group.pubkey, true);
      }
      (window?.log?.info || console.warn)(
        `Not polling for ${loggingId}; timeout: ${convoPollingTimeout} ; diff: ${diff}`
      );

      return Promise.resolve(false);
    });
    try {
      await Promise.all([directPromise, ...groupPromises]);
      const groupResults = await Promise.all(groupPromises);
      for (let i = 0; i < groupResults.length; i++) {
        const groupId = getLoggingId(this.groupPolling[i]);
        window.log.info(`groupId: ${groupId}`)
        if (groupResults[i] === true) {
          window.log.info(`group received messages, resetting count to 0`)
          this.groupPollsSinceActive[groupId] = 0;
        } else {
          if (!this.groupPollsSinceActive[groupId]) {
            window.log.info(`group doesnt exist, initialising`)
            this.groupPollsSinceActive[groupId] = 1;
          } else {
            window.log.info(`group exists, incrementing`)
            this.groupPollsSinceActive[groupId]++;
          }
        }
      }
      console.table(this.groupPollsSinceActive);
    } catch (e) {
      (window?.log?.info || console.warn)('pollForAllKeys swallowing exception: ', e);
      throw e;
    } finally {
      // setTimeout(this.TEST_pollForAllKeys.bind(this), 500);
      setTimeout(this.TEST_pollForAllKeys.bind(this), SWARM_POLLING_TIMEOUT.ACTIVE);
    }
  }


  /**
   * Only exposed as public for testing
   */
  public async TEST_pollOnceForKey(pubkey: PubKey, isGroup: boolean): Promise<boolean> {
    // NOTE: sometimes pubkey is string, sometimes it is object, so
    // accept both until this is fixed:
    const pkStr = pubkey.key;

    const snodes = await snodePool.getSwarmFor(pkStr);

    // Select nodes for which we already have lastHashes
    const alreadyPolled = snodes.filter((n: Snode) => this.lastHashes[n.pubkey_ed25519]);

    // If we need more nodes, select randomly from the remaining nodes:

    // Use 1 node for now:

    // const COUNT = 1;
    // const COUNT = snodes.length;
    const COUNT = this.groupPollsSinceActive ? snodes.length : this.groupPollsSinceActive[pubkey.key] ? 3 : 1;

    // let nodesToPoll = _.sampleSize(alreadyPolled, COUNT);
    let nodesToPoll = _.sampleSize(snodes, COUNT);

    if (nodesToPoll.length < COUNT) {
      const notPolled = _.difference(snodes, alreadyPolled);
      const newNeeded = COUNT - alreadyPolled.length;
      const newNodes = _.sampleSize(notPolled, newNeeded);
      nodesToPoll = [...nodesToPoll, ...newNodes];
    }

    const results = await Promise.all(
      nodesToPoll.map(async (n: Snode) => {
        return this.pollNodeForKey(n, pubkey);
      })
    );

    // Merge results into one list of unique messages
    const messages = _.uniqBy(_.flatten(results), (x: any) => x.hash);

    if (isGroup) {
      // update the last fetched timestamp
      this.groupPolling = this.groupPolling.map(group => {
        if (PubKey.isEqual(pubkey, group.pubkey)) {
          return {
            ...group,
            lastPolledTimestamp: Date.now(),
          };
        }
        return group;
      });
    }

    const newMessages = await this.handleSeenMessages(messages);


    const options = isGroup ? { conversationId: pkStr } : {};

    // newMessages.forEach((m: Message) => {
    //   processMessage(m.data, options);
    // });

    console.count(`@@ poll node once for key. newMessages length: ${newMessages.length}`);
    if (newMessages.length > 10) {
      console.count(`@@ new messages calling process message batch: ${newMessages.length}`)
      processMessages(newMessages, options);
    } else {
      newMessages.forEach((m: Message) => {
        processMessage(m.data, options);
      });
    }

    return newMessages.length > 0;
  }

  // Fetches messages for `pubkey` from `node` potentially updating
  // the lash hash record
  private async pollNodeForKey(node: Snode, pubkey: PubKey): Promise<Array<any>> {
    const edkey = node.pubkey_ed25519;

    const pkStr = pubkey.key;

    const prevHash = await this.getLastHash(edkey, pkStr);

    const messages = await retrieveNextMessages(node, prevHash, pkStr);

    if (!messages.length) {
      return [];
    }

    const lastMessage = _.last(messages);

    await this.updateLastHash(edkey, pubkey, lastMessage.hash, lastMessage.expiration);

    return messages;
  }

  private loadGroupIds() {
    // Start polling for medium size groups as well (they might be in different swarms)
    const convos = getConversationController().getConversations();

    const mediumGroupsOnly = convos.filter(
      (c: ConversationModel) =>
        c.isMediumGroup() && !c.isBlocked() && !c.get('isKickedFromGroup') && !c.get('left')
    );

    mediumGroupsOnly.forEach((c: any) => {
      this.addGroupId(new PubKey(c.id));
      // TODO: unsubscribe if the group is deleted
    });
  }

  private async handleSeenMessages(messages: Array<Message>): Promise<Array<Message>> {
    if (!messages.length) {
      return [];
    }

    const incomingHashes = messages.map((m: Message) => m.hash);

    const dupHashes = await getSeenMessagesByHashList(incomingHashes);
    const newMessages = messages.filter((m: Message) => !dupHashes.includes(m.hash));

    if (newMessages.length) {
      const newHashes = newMessages.map((m: Message) => ({
        expiresAt: m.expiration,
        hash: m.hash,
      }));
      await saveSeenMessageHashes(newHashes);
    }
    return newMessages;
  }

  private async updateLastHash(
    edkey: string,
    pubkey: PubKey,
    hash: string,
    expiration: number
  ): Promise<void> {
    const pkStr = pubkey.key;

    await updateLastHash({
      convoId: pkStr,
      snode: edkey,
      hash,
      expiresAt: expiration,
    });

    if (!this.lastHashes[edkey]) {
      this.lastHashes[edkey] = {};
    }

    this.lastHashes[edkey][pkStr] = hash;
  }

  private async getLastHash(nodeEdKey: string, pubkey: string): Promise<string> {
    // TODO: always retrieve from the database?

    const nodeRecords = this.lastHashes[nodeEdKey];

    if (!nodeRecords || !nodeRecords[pubkey]) {
      const lastHash = await getLastHashBySnode(pubkey, nodeEdKey);

      return lastHash || '';
    } else {
      // Don't need to go to the database every time:
      return nodeRecords[pubkey];
    }
  }
}
