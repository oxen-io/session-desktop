/* global textsecure, WebAPI, window, libloki, _, libsession */
function MessageSender() {
  // Currently only used for getProxiedSize() and makeProxiedRequest(), which are only used for fetching previews
  this.server = WebAPI.connect();
}

MessageSender.prototype = {
  constructor: MessageSender,

  async sendContactSyncMessage(convos) {
    let convosToSync;
    if (!convos) {
      convosToSync = await libsession.Utils.SyncMessageUtils.getSyncContacts();
    } else {
      convosToSync = convos;
    }

    if (convosToSync.size === 0) {
      window.log.info('No contacts to sync.');

      return Promise.resolve();
    }
    libloki.api.debug.logContactSync(
      'Triggering contact sync message with:',
      convosToSync
    );

    // We need to sync across 3 contacts at a time
    // This is to avoid hitting storage server limit
    const chunked = _.chunk(convosToSync, 3);
    const syncMessages = await Promise.all(
      chunked.map(c => libloki.api.createContactSyncMessage(c))
    );

    const syncPromises = syncMessages.map(syncMessage =>
      libsession.getMessageQueue().sendSyncMessage(syncMessage)
    );

    return Promise.all(syncPromises);
  },

  sendGroupSyncMessage(conversations) {
    // If we havn't got a primaryDeviceKey then we are in the middle of pairing
    // primaryDevicePubKey is set to our own number if we are the master device
    const primaryDeviceKey = window.storage.get('primaryDevicePubKey');
    if (!primaryDeviceKey) {
      window.log.debug('sendGroupSyncMessage: no primary device pubkey');
      return Promise.resolve();
    }
    // We only want to sync across closed groups that we haven't left
    const activeGroups = conversations.filter(
      c => c.isClosedGroup() && !c.get('left') && !c.get('isKickedFromGroup')
    );
    if (activeGroups.length === 0) {
      window.log.info('No closed group to sync.');
      return Promise.resolve();
    }

    const mediumGroups = activeGroups.filter(c => c.isMediumGroup());

    window.libsession.ClosedGroupV2.syncMediumGroups(mediumGroups);

    const legacyGroups = activeGroups.filter(c => !c.isMediumGroup());

    // We need to sync across 1 group at a time
    // This is because we could hit the storage server limit with one group
    const syncPromises = legacyGroups
      .map(c => libloki.api.createGroupSyncMessage(c))
      .map(syncMessage =>
        libsession.getMessageQueue().sendSyncMessage(syncMessage)
      );

    return Promise.all(syncPromises);
  },

  async sendOpenGroupsSyncMessage(convos) {
    // If we havn't got a primaryDeviceKey then we are in the middle of pairing
    // primaryDevicePubKey is set to our own number if we are the master device
    const primaryDeviceKey = window.storage.get('primaryDevicePubKey');
    if (!primaryDeviceKey) {
      return Promise.resolve();
    }
    const conversations = Array.isArray(convos) ? convos : [convos];

    const openGroupsConvos = await libsession.Utils.SyncMessageUtils.filterOpenGroupsConvos(
      conversations
    );

    if (!openGroupsConvos.length) {
      window.log.info('No open groups to sync');
      return Promise.resolve();
    }

    // Send the whole list of open groups in a single message
    const openGroupsDetails = openGroupsConvos.map(conversation => ({
      url: conversation.id,
      channelId: conversation.get('channelId'),
    }));
    const openGroupsSyncParams = {
      timestamp: Date.now(),
      openGroupsDetails,
    };
    const openGroupsSyncMessage = new libsession.Messages.Outgoing.OpenGroupSyncMessage(
      openGroupsSyncParams
    );

    return libsession.getMessageQueue().sendSyncMessage(openGroupsSyncMessage);
  },
  async sendBlockedListSyncMessage() {
    // If we havn't got a primaryDeviceKey then we are in the middle of pairing
    // primaryDevicePubKey is set to our own number if we are the master device
    const primaryDeviceKey = window.storage.get('primaryDevicePubKey');
    if (!primaryDeviceKey) {
      return Promise.resolve();
    }

    const currentlyBlockedNumbers = window.BlockedNumberController.getBlockedNumbers();

    // currently we only sync user blocked, not groups
    const blockedSyncMessage = new libsession.Messages.Outgoing.BlockedListSyncMessage(
      {
        timestamp: Date.now(),
        numbers: currentlyBlockedNumbers,
        groups: [],
      }
    );
    return libsession.getMessageQueue().sendSyncMessage(blockedSyncMessage);
  },
  syncReadMessages(reads) {
    const myDevice = textsecure.storage.user.getDeviceId();
    // FIXME currently not in used
    if (myDevice !== 1 && myDevice !== '1') {
      const syncReadMessages = new libsession.Messages.Outgoing.SyncReadMessage(
        {
          timestamp: Date.now(),
          readMessages: reads,
        }
      );
      return libsession.getMessageQueue().sendSyncMessage(syncReadMessages);
    }

    return Promise.resolve();
  },

  makeProxiedRequest(url, options) {
    return this.server.makeProxiedRequest(url, options);
  },
  getProxiedSize(url) {
    return this.server.getProxiedSize(url);
  },
};

window.textsecure = window.textsecure || {};

textsecure.MessageSender = function MessageSenderWrapper() {
  const sender = new MessageSender();
  this.sendContactSyncMessage = sender.sendContactSyncMessage.bind(sender);
  this.sendGroupSyncMessage = sender.sendGroupSyncMessage.bind(sender);
  this.sendOpenGroupsSyncMessage = sender.sendOpenGroupsSyncMessage.bind(
    sender
  );
  this.syncReadMessages = sender.syncReadMessages.bind(sender);
  this.makeProxiedRequest = sender.makeProxiedRequest.bind(sender);
  this.getProxiedSize = sender.getProxiedSize.bind(sender);
  this.sendBlockedListSyncMessage = sender.sendBlockedListSyncMessage.bind(
    sender
  );
};

textsecure.MessageSender.prototype = {
  constructor: textsecure.MessageSender,
};
