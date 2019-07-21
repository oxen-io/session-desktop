/* global log, textsecure, dcodeIO, libsignal */
const EventEmitter = require('events');
const nodeFetch = require('node-fetch');
const { URL, URLSearchParams } = require('url');

const GROUPCHAT_POLL_EVERY = 1000; // 1 second

// start sendmessage.js lift
function stringToArrayBuffer(str) {
  if (typeof str !== 'string') {
    throw new Error('Passed non-string to stringToArrayBuffer');
  }
  const res = new ArrayBuffer(str.length);
  const uint = new Uint8Array(res);
  for (let i = 0; i < str.length; i += 1) {
    uint[i] = str.charCodeAt(i);
  }
  return res;
}

function Message(options) {
  this.body = options.body;
  this.attachments = options.attachments || [];
  this.quote = options.quote;
  this.preview = options.preview;
  this.group = options.group;
  this.flags = options.flags;
  this.recipients = options.recipients;
  this.timestamp = options.timestamp;
  this.needsSync = options.needsSync;
  this.expireTimer = options.expireTimer;
  this.profileKey = options.profileKey;
  this.profile = options.profile;

  if (!(this.recipients instanceof Array)) {
    throw new Error('Invalid recipient list');
  }

  if (!this.group && this.recipients.length !== 1) {
    throw new Error('Invalid recipient list for non-group');
  }

  if (typeof this.timestamp !== 'number') {
    throw new Error('Invalid timestamp');
  }

  if (this.expireTimer !== undefined && this.expireTimer !== null) {
    if (typeof this.expireTimer !== 'number' || !(this.expireTimer >= 0)) {
      throw new Error('Invalid expireTimer');
    }
  }

  if (this.attachments) {
    if (!(this.attachments instanceof Array)) {
      throw new Error('Invalid message attachments');
    }
  }
  if (this.flags !== undefined) {
    if (typeof this.flags !== 'number') {
      throw new Error('Invalid message flags');
    }
  }
  if (this.isEndSession()) {
    if (
      this.body !== null ||
      this.group !== null ||
      this.attachments.length !== 0
    ) {
      throw new Error('Invalid end session message');
    }
  } else {
    if (
      typeof this.timestamp !== 'number' ||
      (this.body && typeof this.body !== 'string')
    ) {
      throw new Error('Invalid message body');
    }
    if (this.group) {
      if (
        typeof this.group.id !== 'string' ||
        typeof this.group.type !== 'number'
      ) {
        throw new Error('Invalid group context');
      }
    }
  }
}

Message.prototype = {
  constructor: Message,
  isEndSession() {
    /* eslint-disable more/no-then, no-bitwise */
    return this.flags & textsecure.protobuf.DataMessage.Flags.END_SESSION;
  },
  toProto() {
    if (this.dataMessage instanceof textsecure.protobuf.DataMessage) {
      return this.dataMessage;
    }
    const proto = new textsecure.protobuf.DataMessage();
    if (this.body) {
      proto.body = this.body;
    }
    proto.attachments = this.attachmentPointers;
    if (this.flags) {
      proto.flags = this.flags;
    }
    if (this.group) {
      proto.group = new textsecure.protobuf.GroupContext();
      proto.group.id = stringToArrayBuffer(this.group.id);
      proto.group.type = this.group.type;
    }
    if (Array.isArray(this.preview)) {
      proto.preview = this.preview.map(preview => {
        const item = new textsecure.protobuf.DataMessage.Preview();
        item.title = preview.title;
        item.url = preview.url;
        item.image = preview.image || null;
        return item;
      });
    }
    if (this.quote) {
      const { QuotedAttachment } = textsecure.protobuf.DataMessage.Quote;
      const { Quote } = textsecure.protobuf.DataMessage;

      proto.quote = new Quote();
      const { quote } = proto;

      quote.id = this.quote.id;
      quote.author = this.quote.author;
      quote.text = this.quote.text;
      quote.attachments = (this.quote.attachments || []).map(attachment => {
        const quotedAttachment = new QuotedAttachment();

        quotedAttachment.contentType = attachment.contentType;
        quotedAttachment.fileName = attachment.fileName;
        if (attachment.attachmentPointer) {
          quotedAttachment.thumbnail = attachment.attachmentPointer;
        }

        return quotedAttachment;
      });
    }
    if (this.expireTimer) {
      proto.expireTimer = this.expireTimer;
    }

    if (this.profileKey) {
      proto.profileKey = this.profileKey;
    }

    // Only send the display name for now.
    // In the future we might want to extend this to send other things.
    if (this.profile && this.profile.displayName) {
      const profile = new textsecure.protobuf.DataMessage.LokiProfile();
      profile.displayName = this.profile.displayName;
      proto.profile = profile;
    }

    this.dataMessage = proto;
    return proto;
  },
  toArrayBuffer() {
    return this.toProto().toArrayBuffer();
  },
};
// end sendmessage.js lift

// singleton to relay events to libtextsecure/message_receiver
class LokiPublicChatAPI extends EventEmitter {
  constructor(ourKey) {
    super();
    this.ourKey = ourKey;
    this.lastGot = {};
    this.servers = [];
  }
  findOrCreateServer(hostport) {
    let thisServer = null;
    log.info(`LokiPublicChatAPI looking for ${hostport}`);
    this.servers.forEach(server => {
      // if we already have this hostport registered
      if (server.server === hostport) {
        thisServer = server;
        // FIXME: how do you break out of this loop?
      }
    });
    if (thisServer === null) {
      thisServer = new LokiPublicServerAPI(this, hostport);
      this.servers.push(thisServer);
    }
    return thisServer;
  }
}

class LokiPublicServerAPI {
  constructor(chatAPI, hostport) {
    this.chatAPI = chatAPI;
    this.server = hostport;
    this.channels = [];
  }
  findOrCreateChannel(channelId, conversationId) {
    let thisChannel = null;
    this.channels.forEach(channel => {
      if (
        channel.channelId === channelId &&
        channel.conversationId === conversationId
      ) {
        thisChannel = channel;
      }
    });
    if (thisChannel === null) {
      thisChannel = new LokiPublicChannelAPI(this, channelId, conversationId);
      this.channels.push(thisChannel);
    }
    return thisChannel;
  }
  unregisterChannel(channelId) {
    // find it, remove it
    // if no channels left, request we deregister server
    return channelId || this; // this is just to make eslint happy
  }
}

class LokiPublicChannelAPI {
  constructor(serverAPI, channelId, conversationId) {
    this.serverAPI = serverAPI;
    this.channelId = channelId;
    this.baseChannelUrl = `${serverAPI.server}/channels/${this.channelId}`;
    this.groupName = 'unknown';
    this.conversationId = conversationId;
    this.group_id = '06lokiPublicChat';
    this.lastGot = 0;
    log.info(`registered LokiPublicChannel ${channelId}`);
    // start polling
    this.pollForMessages();
  }

  async pollForChannel(source, endpoint) {
    // groupName will be loaded from server
    const url = new URL(this.baseChannelUrl);
    /*
    const params = {
      include_annotations: 1,
    };
    */
    let res;
    let success = true;
    try {
      res = await nodeFetch(url);
    } catch (e) {
      success = false;
    }

    const response = await res.json();
    if (response.meta.code !== 200) {
      success = false;
    }
    // update this.group_id
    return endpoint || success;
  }

  async pollForDeletions() {
    // let id = 0;
    // read all messages from 0 to current
    // delete local copies if server state has changed to delete
    // run every minute
    const url = new URL(this.baseChannelUrl);
    /*
    const params = {
      include_annotations: 1,
    };
    */
    let res;
    let success = true;
    try {
      res = await nodeFetch(url);
    } catch (e) {
      success = false;
    }

    const response = await res.json();
    if (response.meta.code !== 200) {
      success = false;
    }
    return success;
  }

  async pollForMessages() {
    const url = new URL(`${this.baseChannelUrl}/messages`);
    const params = {
      include_annotations: 1,
      count: -20,
    };
    if (this.lastGot) {
      params.since_id = this.lastGot;
    }
    url.search = new URLSearchParams(params);

    let res;
    let success = true;
    try {
      res = await nodeFetch(url);
    } catch (e) {
      success = false;
    }

    const response = await res.json();
    if (response.meta.code !== 200) {
      success = false;
    }

    if (success) {
      response.data.forEach(adnMessage => {
        // FIXME: create proper message for this message.DataMessage.body
        let timestamp = new Date(adnMessage.created_at).getTime();
        let from = adnMessage.user.username;
        if (adnMessage.annotations.length) {
          const noteValue = adnMessage.annotations[0].value;
          ({ from, timestamp } = noteValue);
        }

        // FIXME: could be much neater if we can get access to something
        // like outgoing_message create new message object

        // getPlaintext is just a cacheOnce wrapper around
        // convertMessageToText

        const attrs = {
          recipients: [this.group_id],
          body: adnMessage.text,
          timestamp,
          attachments: [],
          quote: null,
          preview: [],
          // needsSync: true,
          expireTimer: 0,
          profileKey: null,
          group: {
            id: this.group_id,
            type: textsecure.protobuf.GroupContext.Type.DELIVER,
          },
        };
        log.info('LokiPublicChannel attrs', JSON.stringify(attrs));

        const textMessage = new textsecure.protobuf.DataMessage();
        textMessage.body = adnMessage.text;
        const serverMessage = {
          type: 4, // unencrypted
          source: from,
          timestamp,
          message: textMessage.encode(),
        };
        log.info(
          'LokiPublicChannel serverMessage',
          JSON.stringify(serverMessage)
        );

        /*
        const attrs2 = {
          type: textsecure.protobuf.Envelope.Type.CIPHERTEXT,
          source: from,
          sourceDevice: 1,
          timestamp,
        };
        const signal = new textsecure.protobuf.Envelope(attrs2).toArrayBuffer();
        const websocketmessage = new textsecure.protobuf.WebSocketMessage({
          type: textsecure.protobuf.WebSocketMessage.Type.REQUEST,
          request: { verb: 'PUT', path: '/messages' },
        });
        log.info(`LokiPublicChannel websocketmessage`, JSON.stringify(websocketmessage));
        log.info(`LokiPublicChannel signal`, JSON.stringify(signal));
        */

        // const dataMessage = new Message(attrs);
        // didn't try this
        /*
        const dataMessage = new textsecure.protobuf.DataMessage();
        dataMessage.group = new textsecure.protobuf.GroupContext();
        dataMessage.group.id = stringToArrayBuffer(this.group_id);
        dataMessage.group.type = textsecure.protobuf.GroupContext.Type.DELIVER;
        dataMessage.group.name = "Some Group";
        */

        /*
        const protoBufContent = new textsecure.protobuf.Content();
        protoBufContent.dataMessage = dataMessage;
        const message = protoBufContent;
        */

        const message = textMessage;
        log.info('LokiPublicChannel message', JSON.stringify(message));

        // start convertMessageToText
        const messageBuffer = message.toArrayBuffer();
        log.info(
          'LokiPublicChannel messageBuffer',
          JSON.stringify(messageBuffer)
        );

        // start getPaddedMessageLength
        const messageLengthWithTerminator = messageBuffer.byteLength + 1 + 1;
        let messagePartCount = Math.floor(messageLengthWithTerminator / 160);

        if (messageLengthWithTerminator % 160 !== 0) {
          messagePartCount += 1;
        }
        // end getPaddedMessageLength

        const plaintext = new Uint8Array(messagePartCount * 160 - 1);
        plaintext.set(new Uint8Array(messageBuffer));
        plaintext[messageBuffer.byteLength] = 0x80;
        // end convertMessageToText
        log.info('LokiPublicChannel going to wrap', JSON.stringify(plaintext));

        const content = new Uint8Array(
          dcodeIO.ByteBuffer.wrap(plaintext, 'binary').toArrayBuffer()
        );
        log.info('LokiPublicChannel content', content);
        // start wrapInWebsocketMessage
        // outgoingObject
        const messageEnvelope = new textsecure.protobuf.Envelope({
          type: textsecure.protobuf.Envelope.Type.PUBLIC_CHAT_MSG,
          source: from,
          sourceDevice: 1,
          relay: null,
          timestamp,
          legacyMessage: null,
          content,
          serverGuid: adnMessage.id, // FIXME: include server/channelId
          serverTimestamp: timestamp,
          // not in the SignalService.proto
          // ourKey: from,
          // friendRequest: false,
          // destinationRegistrationId: 1,
          // isP2p: false,
          // isPublic: true,
        });
        log.info(
          'LokiPublicChannel messageEnvelope',
          JSON.stringify(messageEnvelope)
        );
        const requestMessage = new textsecure.protobuf.WebSocketRequestMessage({
          id: new Uint8Array(libsignal.crypto.getRandomBytes(1))[0], // random ID for now
          verb: 'PUT',
          path: '/api/v1/message',
          body: messageEnvelope.encode().toArrayBuffer(),
        });
        const websocketMessage = new textsecure.protobuf.WebSocketMessage({
          type: textsecure.protobuf.WebSocketMessage.Type.REQUEST,
          request: requestMessage,
        });
        const socketMessage = new Uint8Array(
          websocketMessage.encode().toArrayBuffer()
        );
        // end wrapInWebsocketMessage

        // const socketMessage = new Uint8Array(websocketMessage.encode()
        // .toArrayBuffer());

        // log.info(`socketMessage LokiPublicChannel`, JSON.stringify(socketMessage));
        this.serverAPI.chatAPI.emit('publicMessage', {
          // message: post.text,
          message: socketMessage, // break it somewhere else...
          isPublic: true,
        });
        this.lastGot = !this.lastGot
          ? adnMessage.id
          : Math.max(this.lastGot, adnMessage.id);
      });
    }

    setTimeout(() => {
      this.pollForMessages();
    }, GROUPCHAT_POLL_EVERY);
  }
}

module.exports = LokiPublicChatAPI;
