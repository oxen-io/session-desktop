import { ContactInfo, ContactInfoSet } from 'libsession_util_nodejs';
import { ConversationModel } from '../../../models/conversation';
import { getContactInfoFromDBValues } from '../../../types/sqlSharedTypes';
import { ContactsWrapperActions } from '../../../webworker/workers/browser/libsession_worker_interface';
import { ConvoHub } from '../../conversations';
import { PubKey } from '../../types';
import { CONVERSATION_PRIORITIES } from '../../../models/conversationAttributes';

/**
 * This file is centralizing the management of data from the Contacts Wrapper of libsession.
 * It allows to make changes to the wrapper and keeps track of the decoded values of those in the in-memory cache named `mappedContactWrapperValues`.
 *
 * The wrapper content is just a blob which has no structure.
 * Rather than having to fetch the required data from it every time we need it (during each rerendering), we keep a decoded cache here.
 * Essentially, on app start we load all the content from the wrapper with `SessionUtilContact.refreshMappedValue` during the ConversationController initial load.
 * Then, every time we do a change to the contacts wrapper, we do it through `insertContactFromDBIntoWrapperAndRefresh`.
 * This applies the change from the in-memory conversationModel to the ContactsWrapper, refetch the data from it and update the decoded cache `mappedContactWrapperValues` with the up to date data.
 * It then triggers a UI refresh of that specific conversation with `triggerUIRefresh` to make sure whatever is displayed on screen is still up to date with the wrapper content.
 *
 * Also, to make sure that our wrapper is up to date, we schedule jobs to be run and fetch all contacts and update all the wrappers entries.
 * This is done in the
 *    - `UserSyncJob` (sending data to the network) and the
 *
 */
const mappedContactWrapperValues = new Map<string, ContactInfo>();

/**
 * Returns true if that conversation is not us, is private, is not blinded.
 *
 * We want to sync the message request status so we need to allow a contact even if it's not approved, did not approve us and is not blocked.
 */
function isContactToStoreInWrapper(convo: ConversationModel): boolean {
  try {
    PubKey.cast(convo.id as string);
  } catch (e) {
    return false;
  }
  return !convo.isMe() && convo.isPrivate() && convo.isActive() && !PubKey.isBlinded(convo.id);
}

/**
 * Fetches the specified convo and updates the required field in the wrapper.
 * If that contact does not exist in the wrapper, it is created before being updated.
 */

async function insertContactFromDBIntoWrapperAndRefresh(
  id: string
): Promise<ContactInfoSet | null> {
  const foundConvo = ConvoHub.use().get(id);
  if (!foundConvo) {
    return null;
  }

  if (!SessionUtilContact.isContactToStoreInWrapper(foundConvo)) {
    return null;
  }
  // Note: We NEED those to come from the convo itself as .get() calls directly
  // and not from the isApproved(), didApproveMe() functions.
  //
  // The reason is that when we make a change, we need to save it to the DB to update the libsession state (on commit()).
  // But, if we use isApproved() instead of .get('isApproved'), we get the value from libsession which is not up to date with a change made in the convo yet!
  const dbName = foundConvo.getRealSessionUsername() || undefined;
  const dbNickname = foundConvo.get('nickname');
  const dbProfileUrl = foundConvo.get('avatarPointer') || undefined;
  const dbProfileKey = foundConvo.get('profileKey') || undefined;
  const dbApproved = !!foundConvo.get('isApproved');
  const dbApprovedMe = !!foundConvo.get('didApproveMe');
  const dbBlocked = foundConvo.isBlocked();
  const priority = foundConvo.get('priority') || CONVERSATION_PRIORITIES.default;
  const expirationMode = foundConvo.get('expirationMode') || undefined;
  const expireTimer = foundConvo.get('expireTimer') || 0;

  const wrapperContact = getContactInfoFromDBValues({
    id,
    dbApproved,
    dbApprovedMe,
    dbBlocked,
    dbName,
    dbNickname,
    dbProfileKey,
    dbProfileUrl,
    priority,
    dbCreatedAtSeconds: 0, // just give 0, now() will be used internally by the wrapper if the contact does not exist yet.
    expirationMode,
    expireTimer,
  });
  try {
    window.log.debug('inserting into contact wrapper: ', JSON.stringify(wrapperContact));
    await ContactsWrapperActions.set(wrapperContact);
    // returned for testing purposes only
    return wrapperContact;
  } catch (e) {
    window.log.warn(`ContactsWrapperActions.set of ${id} failed with ${e.message}`);
    // we still let this go through
  }

  await refreshMappedValue(id);
  return null;
}

/**
 * @param duringAppStart set this to true if we should just fetch the cached value but not trigger a UI refresh of the corresponding conversation
 */
async function refreshMappedValue(id: string, duringAppStart = false) {
  const fromWrapper = await ContactsWrapperActions.get(id);

  if (fromWrapper) {
    setMappedValue(fromWrapper);
    if (!duringAppStart) {
      ConvoHub.use().get(id)?.triggerUIRefresh();
    }
  } else if (mappedContactWrapperValues.delete(id)) {
    if (!duringAppStart) {
      ConvoHub.use().get(id)?.triggerUIRefresh();
    }
  }
}

function setMappedValue(info: ContactInfo) {
  mappedContactWrapperValues.set(info.id, info);
}

// TODO we should probably update the returned type as we only use the createdAt from the wrapper returned data
function getContactCached(id: string) {
  return mappedContactWrapperValues.get(id);
}

async function removeContactFromWrapper(id: string) {
  try {
    await ContactsWrapperActions.erase(id);
  } catch (e) {
    window.log.warn(`ContactsWrapperActions.erase of ${id} failed with ${e.message}`);
  }
  await refreshMappedValue(id);
}
export const SessionUtilContact = {
  isContactToStoreInWrapper,
  insertContactFromDBIntoWrapperAndRefresh,
  removeContactFromWrapper,
  getContactCached,
  refreshMappedValue,
};
