/* global window, textsecure, dcodeIO, StringView, ConversationController, _ */
/* eslint-disable no-bitwise */

// eslint-disable-next-line func-names
(function() {
  window.libloki = window.libloki || {};

  const DebugFlagsEnum = {
    GROUP_SYNC_MESSAGES: 1,
    CONTACT_SYNC_MESSAGES: 2,
    AUTO_FRIEND_REQUEST_MESSAGES: 4,
    SESSION_REQUEST_MESSAGES: 8,
    SESSION_MESSSAGE_SENDING: 16,
    SESSION_BACKGROUND_MESSSAGE: 32,
    // If you add anything, be sure it is bitwise safe! (unique and 2 multiples)
  };

  const debugFlags =
    DebugFlagsEnum.GROUP_SYNC_MESSAGES |
    DebugFlagsEnum.CONTACT_SYNC_MESSAGES |
    DebugFlagsEnum.AUTO_FRIEND_REQUEST_MESSAGES |
    DebugFlagsEnum.SESSION_REQUEST_MESSAGES |
    DebugFlagsEnum.SESSION_MESSSAGE_SENDING |
    DebugFlagsEnum.SESSION_BACKGROUND_MESSSAGE;

  // feel free to change this to window.console.warn to have a stack with all those logs
  // disable loki logs
  const debugLogFn = undefined; // window.log.info;

  function logSessionMessageSending(...args) {
    if (debugFlags | DebugFlagsEnum.SESSION_MESSSAGE_SENDING && debugLogFn) {
      debugLogFn(...args);
    }
  }

  function logGroupSync(...args) {
    if (debugFlags | DebugFlagsEnum.GROUP_SYNC_MESSAGES && debugLogFn) {
      debugLogFn(...args);
    }
  }

  function logContactSync(...args) {
    if (debugFlags | DebugFlagsEnum.GROUP_CONTACT_MESSAGES && debugLogFn) {
      debugLogFn(...args);
    }
  }

  function logAutoFriendRequest(...args) {
    if (
      debugFlags | DebugFlagsEnum.AUTO_FRIEND_REQUEST_MESSAGES &&
      debugLogFn
    ) {
      debugLogFn(...args);
    }
  }

  function logSessionRequest(...args) {
    if (debugFlags | DebugFlagsEnum.SESSION_REQUEST_MESSAGES && debugLogFn) {
      debugLogFn(...args);
    }
  }

  function logBackgroundMessage(...args) {
    if (debugFlags | DebugFlagsEnum.SESSION_BACKGROUND_MESSSAGE && debugLogFn) {
      debugLogFn(...args);
    }
  }

  // Returns the primary device pubkey for this secondary device pubkey
  // or the same pubkey if there is no other device
  async function getPrimaryDevicePubkey(pubKey) {
    const authorisation = await window.libloki.storage.getGrantAuthorisationForSecondaryPubKey(
      pubKey
    );
    return authorisation ? authorisation.primaryDevicePubKey : pubKey;
  }

  async function sendBackgroundMessage(pubKey, debugMessageType) {
    const primaryPubKey = await getPrimaryDevicePubkey(pubKey);
    if (primaryPubKey !== pubKey) {
      // if we got the secondary device pubkey first,
      // call ourself again with the primary device pubkey
      await sendBackgroundMessage(primaryPubKey, debugMessageType);
      return;
    }

    const backgroundMessage = textsecure.OutgoingMessage.buildBackgroundMessage(pubKey, debugMessageType);
    await backgroundMessage.sendToNumber(pubKey);
  }

  async function sendAutoFriendRequestMessage(pubKey) {
    const primaryPubKey = await getPrimaryDevicePubkey(pubKey);
    if (primaryPubKey !== pubKey) {
      // if we got the secondary device pubkey first,
      // call ourself again with the primary device pubkey
      await sendAutoFriendRequestMessage(primaryPubKey);
      return;
    }

    const autoFrMessage = textsecure.OutgoingMessage.buildAutoFriendRequestMessage(pubKey);
    await autoFrMessage.sendToNumber(pubKey);
  }

  function createPairingAuthorisationProtoMessage({
    primaryDevicePubKey,
    secondaryDevicePubKey,
    requestSignature,
    grantSignature,
  }) {
    if (!primaryDevicePubKey || !secondaryDevicePubKey || !requestSignature) {
      throw new Error(
        'createPairingAuthorisationProtoMessage: pubkeys missing'
      );
    }
    if (requestSignature.constructor !== ArrayBuffer) {
      throw new Error(
        'createPairingAuthorisationProtoMessage expects a signature as ArrayBuffer'
      );
    }
    if (grantSignature && grantSignature.constructor !== ArrayBuffer) {
      throw new Error(
        'createPairingAuthorisationProtoMessage expects a signature as ArrayBuffer'
      );
    }
    return new textsecure.protobuf.PairingAuthorisationMessage({
      requestSignature: new Uint8Array(requestSignature),
      grantSignature: grantSignature ? new Uint8Array(grantSignature) : null,
      primaryDevicePubKey,
      secondaryDevicePubKey,
    });
  }

  function sendUnpairingMessageToSecondary(pubKey) {
    const unpairingMessage = textsecure.OutgoingMessage.buildUnpairingMessage(pubKey);
    return unpairingMessage.sendToNumber(pubKey);
  }
  // Serialise as <Element0.length><Element0><Element1.length><Element1>...
  // This is an implementation of the reciprocal of contacts_parser.js
  function serialiseByteBuffers(buffers) {
    const result = new dcodeIO.ByteBuffer();
    buffers.forEach(buffer => {
      // bytebuffer container expands and increments
      // offset automatically
      result.writeInt32(buffer.limit);
      result.append(buffer);
    });
    result.limit = result.offset;
    result.reset();
    return result;
  }
  async function createContactSyncProtoMessage(sessionContacts) {
    // Extract required contacts information out of conversations

    if (sessionContacts.length === 0) {
      return null;
    }

    const rawContacts = await Promise.all(
      sessionContacts.map(async conversation => {
        const profile = conversation.getLokiProfile();
        const number = conversation.getNumber();
        const name = profile
          ? profile.displayName
          : conversation.getProfileName();
        const status = await conversation.safeGetVerified();
        const protoState = textsecure.storage.protocol.convertVerifiedStatusToProtoState(
          status
        );
        const verified = new textsecure.protobuf.Verified({
          state: protoState,
          destination: number,
          identityKey: StringView.hexToArrayBuffer(number),
        });
        return {
          name,
          verified,
          number,
          nickname: conversation.getNickname(),
          blocked: conversation.isBlocked(),
          expireTimer: conversation.get('expireTimer'),
        };
      })
    );
    // Convert raw contacts to an array of buffers
    const contactDetails = rawContacts
      .filter(x => x.number !== textsecure.storage.user.getNumber())
      .map(x => new textsecure.protobuf.ContactDetails(x))
      .map(x => x.encode());
    // Serialise array of byteBuffers into 1 byteBuffer
    const byteBuffer = serialiseByteBuffers(contactDetails);
    const data = new Uint8Array(byteBuffer.toArrayBuffer());
    const contacts = new textsecure.protobuf.SyncMessage.Contacts({
      data,
    });
    const syncMessage = new textsecure.protobuf.SyncMessage({
      contacts,
    });
    return syncMessage;
  }
  function createGroupSyncProtoMessage(sessionGroup) {
    // We are getting a single open group here

    const rawGroup = {
      id: window.Signal.Crypto.bytesFromString(sessionGroup.id),
      name: sessionGroup.get('name'),
      members: sessionGroup.get('members') || [],
      blocked: sessionGroup.isBlocked(),
      expireTimer: sessionGroup.get('expireTimer'),
      admins: sessionGroup.get('groupAdmins') || [],
    };

    // Convert raw group to a buffer
    const groupDetail = new textsecure.protobuf.GroupDetails(rawGroup).encode();
    // Serialise array of byteBuffers into 1 byteBuffer
    const byteBuffer = serialiseByteBuffers([groupDetail]);
    const data = new Uint8Array(byteBuffer.toArrayBuffer());
    const groups = new textsecure.protobuf.SyncMessage.Groups({
      data,
    });
    const syncMessage = new textsecure.protobuf.SyncMessage({
      groups,
    });
    return syncMessage;
  }
  function createOpenGroupsSyncProtoMessage(conversations) {
    // We only want to sync across open groups that we haven't left
    const sessionOpenGroups = conversations.filter(
      c => c.isPublic() && !c.isRss() && !c.get('left')
    );

    if (sessionOpenGroups.length === 0) {
      return null;
    }

    const openGroups = sessionOpenGroups.map(
      conversation =>
        new textsecure.protobuf.SyncMessage.OpenGroupDetails({
          url: conversation.id.split('@').pop(),
          channelId: conversation.get('channelId'),
        })
    );

    const syncMessage = new textsecure.protobuf.SyncMessage({
      openGroups,
    });
    return syncMessage;
  }
  async function sendPairingAuthorisation(authorisation, recipientPubKey) {
    const pairingAuthorisation = createPairingAuthorisationProtoMessage(
      authorisation
    );
    const ourNumber = textsecure.storage.user.getNumber();
    const ourConversation = await ConversationController.getOrCreateAndWait(
      ourNumber,
      'private'
    );
    // Send
    const p = new Promise((resolve, reject) => {
      const callback = result => {
        // callback
        if (result.errors.length > 0) {
          reject(result.errors[0]);
        } else {
          resolve();
        }
      };
      const pairingRequestMessage = textsecure.OutgoingMessage.buildPairingRequestMessage(recipientPubKey, ourNumber, ourConversation, authorisation, pairingAuthorisation, callback);

      pairingRequestMessage.sendToNumber(recipientPubKey);
    });
    return p;
  }

  function sendSessionRequestsToMembers(members = []) {
    // For every member, see if we need to establish a session:
    members.forEach(memberPubKey => {
      const haveSession = _.some(
        textsecure.storage.protocol.sessions,
        s => s.number === memberPubKey
      );

      const ourPubKey = textsecure.storage.user.getNumber();
      if (!haveSession && memberPubKey !== ourPubKey) {
        // eslint-disable-next-line more/no-then
        ConversationController.getOrCreateAndWait(memberPubKey, 'private').then(
          () => {
            const sessionRequestMessage = textsecure.OutgoingMessage.buildSessionRequestMessage(memberPubKey);
            sessionRequestMessage.sendToNumber(memberPubKey);
          }
        );
      }
    });
  }

  const debug = {
    logContactSync,
    logGroupSync,
    logAutoFriendRequest,
    logSessionRequest,
    logSessionMessageSending,
    logBackgroundMessage,
  };

  window.libloki.api = {
    sendBackgroundMessage,
    sendAutoFriendRequestMessage,
    sendSessionRequestsToMembers,
    sendPairingAuthorisation,
    createPairingAuthorisationProtoMessage,
    sendUnpairingMessageToSecondary,
    createContactSyncProtoMessage,
    createGroupSyncProtoMessage,
    createOpenGroupsSyncProtoMessage,
    debug,
  };
})();
