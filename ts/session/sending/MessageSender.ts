// REMOVE COMMENT AFTER: This can just export pure functions as it doesn't need state

import { AbortController } from 'abort-controller';
import ByteBuffer from 'bytebuffer';
import _, { isEmpty, isNil, isNumber, isString, sample, toNumber } from 'lodash';
import pRetry from 'p-retry';
import { Data } from '../../data/data';
import { SignalService } from '../../protobuf';
import { OpenGroupRequestCommonType } from '../apis/open_group_api/opengroupV2/ApiUtil';
import { OpenGroupMessageV2 } from '../apis/open_group_api/opengroupV2/OpenGroupMessageV2';
import {
  sendMessageOnionV4BlindedRequest,
  sendSogsMessageOnionV4,
} from '../apis/open_group_api/sogsv3/sogsV3SendMessage';
import { PingPong421 } from '../apis/snode_api/PingPong421';
import {
  NotEmptyArrayOfBatchResults,
  StoreOnNodeMessage,
  StoreOnNodeParams,
  StoreOnNodeParamsNoSig,
} from '../apis/snode_api/SnodeRequestTypes';
import { GetNetworkTime } from '../apis/snode_api/getNetworkTime';
import { SnodeNamespace, SnodeNamespaces } from '../apis/snode_api/namespaces';
import { getSwarmFor } from '../apis/snode_api/snodePool';
import { SnodeSignature, SnodeSignatureResult } from '../apis/snode_api/snodeSignatures';
import { SnodeAPIStore } from '../apis/snode_api/storeMessage';
import { getConversationController } from '../conversations';
import { MessageEncrypter } from '../crypto';
import { addMessagePadding } from '../crypto/BufferPadding';
import { ContentMessage } from '../messages/outgoing';
import { ConfigurationMessage } from '../messages/outgoing/controlMessage/ConfigurationMessage';
import { SharedConfigMessage } from '../messages/outgoing/controlMessage/SharedConfigMessage';
import { UnsendMessage } from '../messages/outgoing/controlMessage/UnsendMessage';
import { ClosedGroupNewMessage } from '../messages/outgoing/controlMessage/group/ClosedGroupNewMessage';
import { OpenGroupVisibleMessage } from '../messages/outgoing/visibleMessage/OpenGroupVisibleMessage';
import { ed25519Str } from '../onions/onionPath';
import { PubKey } from '../types';
import { RawMessage } from '../types/RawMessage';
import { UserUtils } from '../utils';
import { fromUInt8ArrayToBase64 } from '../utils/String';
import { EmptySwarmError } from '../utils/errors';

// ================ SNODE STORE ================

function overwriteOutgoingTimestampWithNetworkTimestamp(message: { plainTextBuffer: Uint8Array }) {
  const networkTimestamp = GetNetworkTime.getNowWithNetworkOffset();

  const { plainTextBuffer } = message;
  const contentDecoded = SignalService.Content.decode(plainTextBuffer);

  const { dataMessage, dataExtractionNotification, typingMessage } = contentDecoded;
  if (dataMessage && dataMessage.timestamp && toNumber(dataMessage.timestamp) > 0) {
    // this is a sync message, do not overwrite the message timestamp
    if (dataMessage.syncTarget) {
      return {
        overRiddenTimestampBuffer: plainTextBuffer,
        networkTimestamp: _.toNumber(dataMessage.timestamp),
      };
    }
    dataMessage.timestamp = networkTimestamp;
  }
  if (
    dataExtractionNotification &&
    dataExtractionNotification.timestamp &&
    toNumber(dataExtractionNotification.timestamp) > 0
  ) {
    dataExtractionNotification.timestamp = networkTimestamp;
  }
  if (typingMessage && typingMessage.timestamp && toNumber(typingMessage.timestamp) > 0) {
    typingMessage.timestamp = networkTimestamp;
  }
  const overRiddenTimestampBuffer = SignalService.Content.encode(contentDecoded).finish();
  return { overRiddenTimestampBuffer, networkTimestamp };
}

function getMinRetryTimeout() {
  return 1000;
}

function isContentSyncMessage(message: ContentMessage) {
  if (
    message instanceof ConfigurationMessage ||
    message instanceof ClosedGroupNewMessage ||
    message instanceof UnsendMessage ||
    message instanceof SharedConfigMessage ||
    (message as any).syncTarget?.length > 0
  ) {
    return true;
  }
  return false;
}

/**
 * Send a single message via service nodes.
 *
 * @param message The message to send.
 * @param attempts The amount of times to attempt sending. Minimum value is 1.
 */
async function send({
  message,
  retryMinTimeout = 100,
  attempts = 3,
  isSyncMessage,
}: {
  message: RawMessage;
  attempts?: number;
  retryMinTimeout?: number; // in ms
  isSyncMessage: boolean;
}): Promise<{ wrappedEnvelope: Uint8Array; effectiveTimestamp: number }> {
  return pRetry(
    async () => {
      const recipient = PubKey.cast(message.device);

      // we can only have a single message in this send function for now
      const [encryptedAndWrapped] = await encryptMessagesAndWrap([
        {
          destination: message.device,
          plainTextBuffer: message.plainTextBuffer,
          namespace: message.namespace,
          ttl: message.ttl,
          identifier: message.identifier,
          isSyncMessage: Boolean(isSyncMessage),
        },
      ]);

      // make sure to update the local sent_at timestamp, because sometimes, we will get the just pushed message in the receiver side
      // before we return from the await below.
      // and the isDuplicate messages relies on sent_at timestamp to be valid.
      const found = await Data.getMessageById(encryptedAndWrapped.identifier);
      // make sure to not update the sent timestamp if this a currently syncing message
      if (found && !found.get('sentSync')) {
        found.set({ sent_at: encryptedAndWrapped.networkTimestamp });
        await found.commit();
      }
      let foundMessage = encryptedAndWrapped.identifier
        ? await Data.getMessageById(encryptedAndWrapped.identifier)
        : null;

      const isSyncedDeleteAfterReadMessage =
        found &&
        UserUtils.isUsFromCache(recipient.key) &&
        found.getExpirationType() === 'deleteAfterRead' &&
        found.getExpireTimerSeconds() > 0 &&
        encryptedAndWrapped.isSyncMessage;

      let overridenTtl = encryptedAndWrapped.ttl;
      if (isSyncedDeleteAfterReadMessage && found.getExpireTimerSeconds() > 0) {
        const asMs = found.getExpireTimerSeconds() * 1000;
        window.log.debug(`overriding ttl for synced DaR message to ${asMs}`);
        overridenTtl = asMs;
      }

      const batchResult = await MessageSender.sendMessagesDataToSnode(
        [
          {
            pubkey: recipient.key,
            data64: encryptedAndWrapped.data64,
            ttl: overridenTtl,
            timestamp: encryptedAndWrapped.networkTimestamp,
            namespace: encryptedAndWrapped.namespace,
          },
        ],
        recipient.key,
        null
      );

      const isDestinationClosedGroup = getConversationController()
        .get(recipient.key)
        ?.isClosedGroup();
      const storedAt = batchResult?.[0]?.body?.t;
      const storedHash = batchResult?.[0]?.body?.hash;

      if (
        batchResult &&
        !isEmpty(batchResult) &&
        batchResult[0].code === 200 &&
        !isEmpty(storedHash) &&
        isString(storedHash) &&
        isNumber(storedAt)
      ) {
        // TODO: the expiration is due to be returned by the storage server on "store" soon, we will then be able to use it instead of doing the storedAt + ttl logic below
        // if we have a hash and a storedAt, mark it as seen so we don't reprocess it on the next retrieve
        await Data.saveSeenMessageHashes([
          { expiresAt: storedAt + encryptedAndWrapped.ttl, hash: storedHash },
        ]);
        // If message also has a sync message, save that hash. Otherwise save the hash from the regular message send i.e. only closed groups in this case.

        if (
          encryptedAndWrapped.identifier &&
          (encryptedAndWrapped.isSyncMessage || isDestinationClosedGroup)
        ) {
          // get a fresh copy of the message from the DB
          foundMessage = await Data.getMessageById(encryptedAndWrapped.identifier);
          if (foundMessage) {
            await foundMessage.updateMessageHash(storedHash);
            await foundMessage.commit();
          }
        }
      }

      return {
        wrappedEnvelope: encryptedAndWrapped.data,
        effectiveTimestamp: encryptedAndWrapped.networkTimestamp,
      };
    },
    {
      retries: Math.max(attempts - 1, 0),
      factor: 1,
      minTimeout: retryMinTimeout || MessageSender.getMinRetryTimeout(),
    }
  );
}

async function sendMessagesDataToSnode(
  params: Array<StoreOnNodeParamsNoSig>,
  destination: string,
  messagesHashesToDelete: Set<string> | null
): Promise<NotEmptyArrayOfBatchResults> {
  const rightDestination = params.filter(m => m.pubkey === destination);
  const swarm = await getSwarmFor(destination);

  const withSigWhenRequired: Array<StoreOnNodeParams> = await Promise.all(
    rightDestination.map(async item => {
      // some namespaces require a signature to be added
      let signOpts: SnodeSignatureResult | undefined;
      if (SnodeNamespace.isUserConfigNamespace(item.namespace)) {
        signOpts = await SnodeSignature.getSnodeSignatureParams({
          method: 'store' as const,
          namespace: item.namespace,
          pubkey: destination,
        });
      }
      const store: StoreOnNodeParams = {
        data: item.data64,
        namespace: item.namespace,
        pubkey: item.pubkey,
        timestamp: item.timestamp,
        // sig_timestamp: item.timestamp,
        // sig_timestamp is currently not forwarded from the receiving snode to the other swarm members, and so their sig verify fail.
        // This timestamp is not really needed so we just don't send it in the meantime (the timestamp value is used if the sig_timestamp is not present)
        ttl: item.ttl,
        ...signOpts,
      };
      return store;
    })
  );

  const signedDeleteOldHashesRequest =
    messagesHashesToDelete && messagesHashesToDelete.size
      ? await SnodeSignature.getSnodeSignatureByHashesParams({
          method: 'delete' as const,
          messages: [...messagesHashesToDelete],
          pubkey: destination,
        })
      : null;

  let snode = sample(swarm);
  if (!snode) {
    throw new EmptySwarmError(destination, 'Ran out of swarm nodes to query');
  }

  const rightSwarmForCurrentPk = [
    '452d8d9c105c09d150ad97310c8082f1d9545fd0554d177accff8b8cf98c17b8',
    '96ad275ae0a89cf0f665cd8426ed5ca6c1ecf983c6a879bdd070d7db91973cab',
    '7b28341f90a98cda43576baf90f474ab2a7408094932db68abeee0e99a26adae',
    '1ad24f05ae69cf26ee22c39a37c281cc32d9c62ad9667241cde2f8ecf5a6e956',
    '55dac31711552a12f101aff9687afe34d474387f650741797a0ff6c762ee12ff',
    '512e536913986004fdecdf91f6a6ca90c37a282c55781bd6bddf5d6ff2ef4186',
    '28e9fe70f9d86bfa1b146898e53c167fafc1b8f694f0551257f0a3a9b079b110',
  ];

  const originalSnodeEd25519 = snode.pubkey_ed25519;
  if (rightSwarmForCurrentPk.includes(snode.pubkey_ed25519)) {
    console.warn('making it use wrong swarm');
    snode = sample([
      {
        address: 'u7scdyit1m4qiuyo4gsffbcpie8rz5scbrwn8rmfgtfsdaf5juno.snode',
        ip: '185.234.52.249',
        port: 22021,
        port_https: 22021,
        port_omq: 22020,
        port_quic: 22020,
        pubkey_ed25519: '9f6cc182b192f4eacc10d1ac52858daa0e4beecc0928239165344b61e0bb4cc5',
        pubkey_legacy: '9f6cc182b192f4eacc10d1ac52858daa0e4beecc0928239165344b61e0bb4cc5',
        pubkey_x25519: '2ce63b89f905b72380bfada438900b9fb154b80ff5a7b94e516475537b98e500',
      },
      {
        address: '13x3qjmi4kxq4dcxen7ozmcn7id5jgb56c583gr9iku9uss44tjo.snode',
        ip: '65.108.143.80',
        port: 22118,
        port_https: 22118,
        port_omq: 20218,
        port_quic: 20218,
        pubkey_ed25519: '965f972575d29eed0d8f40bb0bad82ed47b4983bf3367c989faaa7f9dadad453',
        pubkey_legacy: '965f972575d29eed0d8f40bb0bad82ed47b4983bf3367c989faaa7f9dadad453',
        pubkey_x25519: 'c0ad35153207afa026ba1235860bf04209512794f70ab2bffbc1f4f5b7457553',
      },
      {
        address: 'ek8kmo45jyfwyzncmmuhqtsdpuqwuutd75igcf9neazzo6b47kyo.snode',
        ip: '192.99.167.70',
        port: 22021,
        port_https: 22021,
        port_omq: 22020,
        port_quic: 22020,
        pubkey_ed25519: 'a97cb0540ab11b8cf4915524791493dc9dcbfea2b4875b201c28e454fc7ec989',
        pubkey_legacy: '428ea5c35b480b405c4c5ae7c746c36cdd49ce23eeea6617e2462f78783aea81',
        pubkey_x25519: 'c0e30a540d14028bb8d4df5d82df3eda0533cb3e1875de937a41f541a332dd5d',
      },
      {
        address: '3m9dj9ynwk85o5td8fghqxc3rwuq9xerc35ajxjsubpm7pewr4ry.snode',
        ip: '104.243.43.55',
        port: 22134,
        port_https: 22134,
        port_omq: 20234,
        port_quic: 20234,
        pubkey_ed25519: 'cafe34fc02a28fb86e23394dc73d992526efbd04667784bd36985abeb5142688',
        pubkey_legacy: 'cafe34fc02a28fb86e23394dc73d992526efbd04667784bd36985abeb5142688',
        pubkey_x25519: '5987acef97f448e9fc7e27620994d7bb9eacd41dc0d2aa908876eef4410f334f',
      },
      {
        address: 'oirgc99wpymnqifpo3de7ebdrcjdwyqm95m6is4j1mwqn6b4uemo.snode',
        ip: '5.161.90.230',
        port: 22021,
        port_https: 22021,
        port_omq: 22020,
        port_quic: 22020,
        pubkey_ed25519: '8548667ff468162754ad86468ea02323123a01cbfed7eadb4992e8e1783a9a17',
        pubkey_legacy: '8548667ff468162754ad86468ea02323123a01cbfed7eadb4992e8e1783a9a17',
        pubkey_x25519: '210c0e2c7dc2a3de0bde5f5cfa57b7ba2d340bf4d3dc90ae4f47372cda79787a',
      },
      {
        address: 'ymacysnn4ut1irq8ocsg8p9w3jzwmm3ebx856fb6tpwxehc9jafy.snode',
        ip: '185.150.190.48',
        port: 22105,
        port_https: 22105,
        port_omq: 20205,
        port_quic: 20205,
        pubkey_ed25519: '02f0c05842d4e32a91c7832c63b7f4ca6f45af280bcfbf143e8b68f4719f4e0a',
        pubkey_legacy: '02f0c05842d4e32a91c7832c63b7f4ca6f45af280bcfbf143e8b68f4719f4e0a',
        pubkey_x25519: '0eae2afbaff9a2b0c030949c3c1bc99b2324b4d02845eee86eed3a9758816e6d',
      },
      {
        address: 'fc7xzcbk3gxxbxsguktdacrgra7abe1i7ycf8c1z5r4ig7inipuo.snode',
        ip: '95.217.218.66',
        port: 22104,
        port_https: 22104,
        port_omq: 22404,
        port_quic: 22404,
        pubkey_ed25519: '2b3afbb02ac99ef0bec69aa23c3086263b80a255e81853b257d9355376a2ab67',
        pubkey_legacy: '2b3afbb02ac99ef0bec69aa23c3086263b80a255e81853b257d9355376a2ab67',
        pubkey_x25519: '226dfab4897a5fc8802d3c6e27e55938d3a320c1126c7f1c4e82ba9771cedd29',
      },
    ]);
  } else {
    console.warn('making it use a single snode which also reports wrong swarm');
  }
  console.warn(
    'hasBeenReportingInvalid421 ',
    PingPong421.hasBeenReportingInvalid421(originalSnodeEd25519, destination)
  );
  try {
    // No pRetry here as if this is a bad path it will be handled and retried in lokiOnionFetch.
    const storeResults = await SnodeAPIStore.storeOnNode(
      snode,
      withSigWhenRequired,
      signedDeleteOldHashesRequest
    );

    if (!isEmpty(storeResults)) {
      window?.log?.info(
        `sendMessagesToSnode - Successfully stored messages to ${ed25519Str(destination)} via ${
          snode.ip
        }:${snode.port} on namespaces: ${rightDestination.map(m => m.namespace).join(',')}`
      );
    }

    return storeResults;
  } catch (e) {
    const snodeStr = snode ? `${snode.ip}:${snode.port}` : 'null';
    window?.log?.warn(
      `sendMessagesToSnode - "${e.code}:${e.message}" to ${destination} via snode:${snodeStr}`
    );
    throw e;
  }
}

function encryptionBasedOnConversation(destination: PubKey) {
  if (getConversationController().get(destination.key)?.isClosedGroup()) {
    return SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE;
  }
  return SignalService.Envelope.Type.SESSION_MESSAGE;
}

type SharedEncryptAndWrap = {
  ttl: number;
  identifier: string;
  isSyncMessage: boolean;
};

type EncryptAndWrapMessage = {
  plainTextBuffer: Uint8Array;
  destination: string;
  namespace: number | null;
} & SharedEncryptAndWrap;

type EncryptAndWrapMessageResults = {
  data64: string;
  networkTimestamp: number;
  data: Uint8Array;
  namespace: number;
} & SharedEncryptAndWrap;

async function encryptMessageAndWrap(
  params: EncryptAndWrapMessage
): Promise<EncryptAndWrapMessageResults> {
  const {
    destination,
    identifier,
    isSyncMessage: syncMessage,
    namespace,
    plainTextBuffer,
    ttl,
  } = params;

  const { overRiddenTimestampBuffer, networkTimestamp } =
    overwriteOutgoingTimestampWithNetworkTimestamp({ plainTextBuffer });
  const recipient = PubKey.cast(destination);

  const { envelopeType, cipherText } = await MessageEncrypter.encrypt(
    recipient,
    overRiddenTimestampBuffer,
    encryptionBasedOnConversation(recipient)
  );

  const envelope = await buildEnvelope(envelopeType, recipient.key, networkTimestamp, cipherText);

  const data = wrapEnvelope(envelope);
  const data64 = ByteBuffer.wrap(data).toString('base64');

  // override the namespaces if those are unset in the incoming messages
  // right when we upgrade from not having namespaces stored in the outgoing cached messages our messages won't have a namespace associated.
  // So we need to keep doing the lookup of where they should go if the namespace is not set.

  const overridenNamespace = !isNil(namespace)
    ? namespace
    : getConversationController().get(recipient.key)?.isClosedGroup()
      ? SnodeNamespaces.ClosedGroupMessage
      : SnodeNamespaces.UserMessages;

  return {
    data64,
    networkTimestamp,
    data,
    namespace: overridenNamespace,
    ttl,
    identifier,
    isSyncMessage: syncMessage,
  };
}

async function encryptMessagesAndWrap(
  messages: Array<EncryptAndWrapMessage>
): Promise<Array<EncryptAndWrapMessageResults>> {
  return Promise.all(messages.map(encryptMessageAndWrap));
}

/**
 * Send a list of messages to a single service node.
 * Used currently only for sending SharedConfigMessage for multiple messages at a time.
 *
 * @param params the messages to deposit
 * @param destination the pubkey we should deposit those message for
 * @returns the hashes of successful deposit
 */
async function sendMessagesToSnode(
  params: Array<StoreOnNodeMessage>,
  destination: string,
  messagesHashesToDelete: Set<string> | null
): Promise<NotEmptyArrayOfBatchResults | null> {
  try {
    const recipient = PubKey.cast(destination);

    const encryptedAndWrapped = await encryptMessagesAndWrap(
      params.map(m => ({
        destination: m.pubkey,
        plainTextBuffer: m.message.plainTextBuffer(),
        namespace: m.namespace,
        ttl: m.message.ttl(),
        identifier: m.message.identifier,
        isSyncMessage: MessageSender.isContentSyncMessage(m.message),
      }))
    );

    // first update all the associated timestamps of our messages in DB, if the outgoing messages are associated with one.
    await Promise.all(
      encryptedAndWrapped.map(async (m, index) => {
        // make sure to update the local sent_at timestamp, because sometimes, we will get the just pushed message in the receiver side
        // before we return from the await below.
        // and the isDuplicate messages relies on sent_at timestamp to be valid.
        const found = await Data.getMessageById(m.identifier);

        // make sure to not update the sent timestamp if this a currently syncing message
        if (found && !found.get('sentSync')) {
          found.set({ sent_at: encryptedAndWrapped[index].networkTimestamp });
          await found.commit();
        }
      })
    );

    const batchResults = await pRetry(
      async () => {
        return MessageSender.sendMessagesDataToSnode(
          encryptedAndWrapped.map(wrapped => ({
            pubkey: recipient.key,
            data64: wrapped.data64,
            ttl: wrapped.ttl,
            timestamp: wrapped.networkTimestamp,
            namespace: wrapped.namespace,
          })),
          recipient.key,
          messagesHashesToDelete
        );
      },
      {
        retries: 2,
        factor: 1,
        minTimeout: MessageSender.getMinRetryTimeout(),
        maxTimeout: 1000,
      }
    );

    if (!batchResults || isEmpty(batchResults)) {
      throw new Error('result is empty for sendMessagesToSnode');
    }

    const isDestinationClosedGroup = getConversationController()
      .get(recipient.key)
      ?.isClosedGroup();

    await Promise.all(
      encryptedAndWrapped.map(async (message, index) => {
        // If message also has a sync message, save that hash. Otherwise save the hash from the regular message send i.e. only closed groups in this case.
        if (
          message.identifier &&
          (message.isSyncMessage || isDestinationClosedGroup) &&
          batchResults[index] &&
          !isEmpty(batchResults[index]) &&
          isString(batchResults[index].body.hash)
        ) {
          const hashFoundInResponse = batchResults[index].body.hash;
          const foundMessage = await Data.getMessageById(message.identifier);
          if (foundMessage) {
            await foundMessage.updateMessageHash(hashFoundInResponse);
            await foundMessage.commit();
            window?.log?.info(
              `updated message ${foundMessage.get('id')} with hash: ${foundMessage.get(
                'messageHash'
              )}`
            );
          }
        }
      })
    );

    return batchResults;
  } catch (e) {
    window.log.warn(`sendMessagesToSnode failed with ${e.message}`);
    return null;
  }
}

async function buildEnvelope(
  type: SignalService.Envelope.Type,
  sskSource: string | undefined,
  timestamp: number,
  content: Uint8Array
): Promise<SignalService.Envelope> {
  let source: string | undefined;

  if (type === SignalService.Envelope.Type.CLOSED_GROUP_MESSAGE) {
    source = sskSource;
  }

  return SignalService.Envelope.create({
    type,
    source,
    timestamp,
    content,
  });
}

/**
 * This is an outdated practice and we should probably just send the envelope data directly.
 * Something to think about in the future.
 */
function wrapEnvelope(envelope: SignalService.Envelope): Uint8Array {
  const request = SignalService.WebSocketRequestMessage.create({
    id: 0,
    body: SignalService.Envelope.encode(envelope).finish(),
    verb: 'PUT',
    path: '/api/v1/message',
  });

  const websocket = SignalService.WebSocketMessage.create({
    type: SignalService.WebSocketMessage.Type.REQUEST,
    request,
  });
  return SignalService.WebSocketMessage.encode(websocket).finish();
}

// ================ Open Group ================
/**
 * Send a message to an open group v2.
 * @param message The open group message.
 */
async function sendToOpenGroupV2(
  rawMessage: OpenGroupVisibleMessage,
  roomInfos: OpenGroupRequestCommonType,
  blinded: boolean,
  filesToLink: Array<number>
): Promise<OpenGroupMessageV2 | boolean> {
  // we agreed to pad message for opengroupv2
  const paddedBody = addMessagePadding(rawMessage.plainTextBuffer());
  const v2Message = new OpenGroupMessageV2({
    sentTimestamp: GetNetworkTime.getNowWithNetworkOffset(),
    base64EncodedData: fromUInt8ArrayToBase64(paddedBody),
    filesToLink,
  });

  const msg = await sendSogsMessageOnionV4(
    roomInfos.serverUrl,
    roomInfos.roomId,
    new AbortController().signal,
    v2Message,
    blinded
  );
  return msg;
}

/**
 * Send a message to an open group v2.
 * @param message The open group message.
 */
async function sendToOpenGroupV2BlindedRequest(
  encryptedContent: Uint8Array,
  roomInfos: OpenGroupRequestCommonType,
  recipientBlindedId: string
): Promise<{ serverId: number; serverTimestamp: number }> {
  const v2Message = new OpenGroupMessageV2({
    sentTimestamp: GetNetworkTime.getNowWithNetworkOffset(),
    base64EncodedData: fromUInt8ArrayToBase64(encryptedContent),
  });

  // Warning: sendMessageOnionV4BlindedRequest throws
  const msg = await sendMessageOnionV4BlindedRequest(
    roomInfos.serverUrl,
    roomInfos.roomId,
    new AbortController().signal,
    v2Message,
    recipientBlindedId
  );
  return msg;
}

export const MessageSender = {
  sendToOpenGroupV2BlindedRequest,
  sendMessagesDataToSnode,
  sendMessagesToSnode,
  getMinRetryTimeout,
  sendToOpenGroupV2,
  send,
  isContentSyncMessage,
};
