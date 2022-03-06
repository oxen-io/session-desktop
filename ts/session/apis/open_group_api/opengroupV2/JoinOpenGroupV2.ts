import { getV2OpenGroupRoomByRoomId, OpenGroupV2Room } from '../../../../data/opengroups';
import { getConversationController } from '../../../conversations';
import { getSodium } from '../../../crypto';
import { PromiseUtils, ToastUtils } from '../../../utils';
import { forceSyncConfigurationNowIfNeeded } from '../../../utils/syncUtils';
import {
  getOpenGroupV2ConversationId,
  openGroupV2CompleteURLRegex,
  prefixify,
  publicKeyParam,
} from '../utils/OpenGroupUtils';
import { getOpenGroupManager } from './OpenGroupManagerV2';

// Inputs that should work:
// https://sessionopengroup.co/main?public_key=658d29b91892a2389505596b135e76a53db6e11d613a51dbd3d0816adffb231c
// http://sessionopengroup.co/main?public_key=658d29b91892a2389505596b135e76a53db6e11d613a51dbd3d0816adffb231c
// sessionopengroup.co/main?public_key=658d29b91892a2389505596b135e76a53db6e11d613a51dbd3d0816adffb231c (does NOT go to HTTPS)
// https://143.198.213.225:443/main?public_key=658d29b91892a2389505596b135e76a53db6e11d613a51dbd3d0816adffb231c
// 143.198.213.255:80/main?public_key=658d29b91892a2389505596b135e76a53db6e11d613a51dbd3d0816adffb231c

export function parseOpenGroupV2(urlWithPubkey: string): OpenGroupV2Room | undefined {
  const lowerCased = urlWithPubkey.trim().toLowerCase();
  try {
    if (!openGroupV2CompleteURLRegex.test(lowerCased)) {
      throw new Error('regex fail');
    }

    // prefix the URL if it does not have a prefix
    const prefixedUrl = prefixify(lowerCased);
    // new URL fails if the protocol is not explicit
    const url = new URL(prefixedUrl);

    // the port (if any is set) is already in the url.host so no need to += url.port
    const serverUrl = `${url.protocol}//${url.host}`;

    const room: OpenGroupV2Room = {
      serverUrl,
      roomId: url.pathname.slice(1), // remove first '/'
      serverPublicKey: url.search.slice(publicKeyParam.length + 1), // remove the '?' and the 'public_key=' header
    };
    return room;
  } catch (e) {
    window?.log?.error('Invalid Opengroup v2 join URL:', lowerCased, e);
  }
  return undefined;
}

/**
 * Checks if the group pubkey (hashed as blake2b) is in the list of blocked groups (also hashed)
 * @param serverPubKey PubKey of the open group being evaluated
 * @returns true - group is in the blocklist, false - the group is not in the blocklist
 */
export const isGroupInBlockList = async (serverPubKey: string): Promise<boolean> => {
  const blockList = window?.getOpenGroupBlockList();
  if (!blockList || !blockList.length) {
    return false;
  }

  const sodium = await getSodium();
  // generic hash is blake2b
  const serverPubKeyBlake2bHash = sodium.crypto_generichash(32, serverPubKey, null, 'hex');
  return blockList.includes(serverPubKeyBlake2bHash);
};

/**
 * Join an open group using the v2 logic.
 *
 * If you only have an string with all details in it, use parseOpenGroupV2() to extract and check the URL is valid
 *
 * @param server The server URL to join, defaults to https if protocol is not set
 * @param room The room id to join
 * @param publicKey The server publicKey. It comes from the joining link. (or is already here for the default open group server)
 */
async function joinOpenGroupV2(room: OpenGroupV2Room, fromConfigMessage: boolean): Promise<void> {
  if (!room.serverUrl || !room.roomId || room.roomId.length < 2 || !room.serverPublicKey) {
    return;
  }

  if (await isGroupInBlockList(room.serverPublicKey)) {
    return;
  }

  const serverUrl = room.serverUrl.toLowerCase();
  const roomId = room.roomId.toLowerCase();
  const publicKey = room.serverPublicKey.toLowerCase();
  const prefixedServer = prefixify(serverUrl);

  const alreadyExist = await getV2OpenGroupRoomByRoomId({ serverUrl, roomId });
  const conversationId = getOpenGroupV2ConversationId(serverUrl, roomId);
  const existingConvo = getConversationController().get(conversationId);

  if (alreadyExist && existingConvo) {
    window?.log?.warn('Skipping join opengroupv2: already exists');
    return;
  } else if (existingConvo) {
    // we already have a convo associated with it. Remove everything related to it so we start fresh
    window?.log?.warn('leaving before rejoining open group v2 room', conversationId);
    await getConversationController().deleteContact(conversationId);
  }

  // Try to connect to server
  try {
    const conversation = await PromiseUtils.timeout(
      getOpenGroupManager().attemptConnectionV2OneAtATime(prefixedServer, roomId, publicKey),
      20000
    );

    if (!conversation) {
      window?.log?.warn('Failed to join open group v2');
      throw new Error(window.i18n('connectToServerFail'));
    }

    // here we managed to connect to the group.
    // if this is not a Sync Message, we should trigger one
    if (!fromConfigMessage) {
      await forceSyncConfigurationNowIfNeeded();
    }
  } catch (e) {
    window?.log?.error('Could not join open group v2', e.message);
    throw e;
  }
}

/**
 * This function does not throw
 * This function can be used to join an opengroupv2 server, from a user initiated click or from a syncMessage.
 * If the user made the request, the UI callback needs to be set.
 * the callback will be called on loading events (start and stop joining). Also, this callback being set defines if we will trigger a sync message or not.
 *
 * Basically,
 *  - user invitation click => uicallback set
 *  - user join manually from the join open group field => uicallback set
 *  - joining from a sync message => no uicallback
 *
 *
 * return true if the room did not exist before, and we join it correctly
 */
export async function joinOpenGroupV2WithUIEvents(
  completeUrl: string,
  showToasts: boolean,
  fromConfigMessage: boolean,
  uiCallback?: (loading: boolean) => void
): Promise<boolean> {
  try {
    const parsedRoom = parseOpenGroupV2(completeUrl);
    if (!parsedRoom) {
      if (showToasts) {
        ToastUtils.pushToastError('connectToServer', window.i18n('invalidOpenGroupUrl'));
      }
      return false;
    }
    const conversationID = getOpenGroupV2ConversationId(parsedRoom.serverUrl, parsedRoom.roomId);
    if (getConversationController().get(conversationID)) {
      if (showToasts) {
        ToastUtils.pushToastError('publicChatExists', window.i18n('publicChatExists'));
      }
      return false;
    }
    if (showToasts) {
      ToastUtils.pushToastInfo('connectingToServer', window.i18n('connectingToServer'));
    }
    if (uiCallback) {
      uiCallback(true);
    }
    await joinOpenGroupV2(parsedRoom, fromConfigMessage);

    const isConvoCreated = getConversationController().get(conversationID);
    if (isConvoCreated) {
      if (showToasts) {
        ToastUtils.pushToastSuccess(
          'connectToServerSuccess',
          window.i18n('connectToServerSuccess')
        );
      }
      return true;
    } else {
      if (showToasts) {
        ToastUtils.pushToastError('connectToServerFail', window.i18n('connectToServerFail'));
      }
    }
  } catch (error) {
    window?.log?.warn('got error while joining open group:', error.message);
    if (showToasts) {
      ToastUtils.pushToastError('connectToServerFail', window.i18n('connectToServerFail'));
    }
  } finally {
    if (uiCallback) {
      uiCallback(false);
    }
  }
  return false;
}
