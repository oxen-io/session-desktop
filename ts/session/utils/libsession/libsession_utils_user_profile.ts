import { isEmpty } from 'lodash';
import { UserUtils } from '..';
import { SettingsKey } from '../../../data/settings-key';
import { CONVERSATION_PRIORITIES } from '../../../models/conversationAttributes';
import { stringify, toFixedUint8ArrayOfLength } from '../../../types/sqlSharedTypes';
import { Storage } from '../../../util/storage';
import { UserConfigWrapperActions } from '../../../webworker/workers/browser/libsession_worker_interface';
import { ConvoHub } from '../../conversations';
import { fromHexToArray } from '../String';

async function insertUserProfileIntoWrapper(convoId: string) {
  if (!SessionUtilUserProfile.isUserProfileToStoreInWrapper(convoId)) {
    return null;
  }
  const us = UserUtils.getOurPubKeyStrFromCache();
  const ourConvo = ConvoHub.use().get(us);

  if (!ourConvo) {
    throw new Error('insertUserProfileIntoWrapper needs a ourConvo to exist');
  }

  const dbName = ourConvo.getRealSessionUsername() || '';
  const dbProfileUrl = ourConvo.getAvatarPointer() || '';
  const dbProfileKey = fromHexToArray(ourConvo.getProfileKey() || '');
  const priority = ourConvo.get('priority') || CONVERSATION_PRIORITIES.default; // this has to be a direct call to .get() and not getPriority()

  const areBlindedMsgRequestEnabled = !!Storage.get(SettingsKey.hasBlindedMsgRequestsEnabled);

  const expirySeconds = ourConvo.getExpireTimer() || 0;
  window.log.debug(
    `inserting into userprofile wrapper: username:"${dbName}", priority:${priority} image:${JSON.stringify(
      { url: dbProfileUrl, key: stringify(dbProfileKey) }
    )}, settings: ${JSON.stringify({ areBlindedMsgRequestEnabled, expirySeconds })}`
  );
  if (dbProfileUrl && !isEmpty(dbProfileKey)) {
    if (dbProfileKey.length === 32) {
      const fixedLen = toFixedUint8ArrayOfLength(dbProfileKey, 32);
      await UserConfigWrapperActions.setUserInfo(dbName, priority, {
        url: dbProfileUrl,
        key: fixedLen.buffer, // TODO make this use the fixed length array
      });
    }
  } else {
    await UserConfigWrapperActions.setUserInfo(dbName, priority, null);
  }
  await UserConfigWrapperActions.setEnableBlindedMsgRequest(areBlindedMsgRequestEnabled);
  await UserConfigWrapperActions.setNoteToSelfExpiry(expirySeconds);

  // returned for testing purposes only
  return {
    id: convoId,
    name: dbName,
    priority,
    avatarPointer: dbProfileUrl,
    expirySeconds,
  };
}

function isUserProfileToStoreInWrapper(convoId: string) {
  try {
    const us = UserUtils.getOurPubKeyStrFromCache();
    return convoId === us;
  } catch (e) {
    return false;
  }
}

export const SessionUtilUserProfile = {
  insertUserProfileIntoWrapper,
  isUserProfileToStoreInWrapper,
};
