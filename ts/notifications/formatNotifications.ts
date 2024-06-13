import { PubkeyType } from 'libsession_util_nodejs';
import { cloneDeep } from 'lodash';
import { usernameForQuoteOrFullPkOutsideRedux } from '../hooks/useParamSelector';
import {
  ConversationInteractionStatus,
  ConversationInteractionType,
} from '../interactions/conversationInteractions';
import { DataExtractionNotificationMsg, MessageGroupUpdate } from '../models/messageType';
import { SignalService } from '../protobuf';
import { ConvoHub } from '../session/conversations';
import { UserUtils } from '../session/utils';
import { PreConditionFailed } from '../session/utils/errors';
import { CallNotificationType, InteractionNotificationType } from '../state/ducks/conversations';
import { assertUnreachable } from '../types/sqlSharedTypes';

/**
 * @returns true if the array contains only a single item being 'You', 'you' or our device pubkey
 */
export function arrayContainsUsOnly(arrayToCheck: Array<string> | undefined) {
  return (
    arrayToCheck &&
    arrayToCheck.length === 1 &&
    (arrayToCheck[0] === UserUtils.getOurPubKeyStrFromCache() ||
      arrayToCheck[0].toLowerCase() === 'you')
  );
}

function formatGroupUpdateNotification(groupUpdate: MessageGroupUpdate) {
  const us = UserUtils.getOurPubKeyStrFromCache();
  if (groupUpdate.name) {
    return window.i18n('titleIsNow', [groupUpdate.name]);
  }
  if (groupUpdate.avatarChange) {
    return window.i18n('groupAvatarChange');
  }
  if (groupUpdate.left) {
    if (groupUpdate.left.length !== 1) {
      return null;
    }
    if (arrayContainsUsOnly(groupUpdate.left)) {
      return window.i18n('youLeftTheGroup');
    }
    // no more than one can send a leave message at a time
    return window.i18n('leftTheGroup', [
      ConvoHub.use().getContactProfileNameOrShortenedPubKey(groupUpdate.left[0]),
    ]);
  }

  if (groupUpdate.joined) {
    if (!groupUpdate.joined.length) {
      return null;
    }
    return changeOfMembersV2({
      type: 'added',
      us,
      changedWithNames: mapIdsWithNames(
        groupUpdate.joined,
        groupUpdate.joined.map(usernameForQuoteOrFullPkOutsideRedux)
      ),
    });
  }
  if (groupUpdate.joinedWithHistory) {
    if (!groupUpdate.joinedWithHistory.length) {
      return null;
    }
    return changeOfMembersV2({
      type: 'addedWithHistory',
      us,
      changedWithNames: mapIdsWithNames(
        groupUpdate.joinedWithHistory,
        groupUpdate.joinedWithHistory.map(usernameForQuoteOrFullPkOutsideRedux)
      ),
    });
  }
  if (groupUpdate.kicked) {
    if (!groupUpdate.kicked.length) {
      return null;
    }
    if (arrayContainsUsOnly(groupUpdate.kicked)) {
      return window.i18n('youGotKickedFromGroup');
    }
    return changeOfMembersV2({
      type: 'removed',
      us,
      changedWithNames: mapIdsWithNames(
        groupUpdate.kicked,
        groupUpdate.kicked.map(usernameForQuoteOrFullPkOutsideRedux)
      ),
    });
  }
  if (groupUpdate.promoted) {
    if (!groupUpdate.promoted.length) {
      return null;
    }
    return changeOfMembersV2({
      type: 'promoted',
      us,
      changedWithNames: mapIdsWithNames(
        groupUpdate.promoted,
        groupUpdate.promoted.map(usernameForQuoteOrFullPkOutsideRedux)
      ),
    });
  }
  throw new Error('group_update getDescription() case not taken care of');
}

function formatDataExtractionNotification(
  dataExtractionNotification: DataExtractionNotificationMsg
) {
  const { Type } = SignalService.DataExtractionNotification;

  const isScreenshot = dataExtractionNotification.type === Type.SCREENSHOT;

  return window.i18n(isScreenshot ? 'tookAScreenshot' : 'savedTheFile', [
    ConvoHub.use().getContactProfileNameOrShortenedPubKey(dataExtractionNotification.source),
  ]);
}

function formatInteractionNotification(
  interactionNotification: InteractionNotificationType,
  conversationId: string
) {
  const { interactionType, interactionStatus } = interactionNotification;

  // NOTE For now we only show interaction errors in the message history
  if (interactionStatus === ConversationInteractionStatus.Error) {
    const convo = ConvoHub.use().get(conversationId);

    if (convo) {
      const isGroup = !convo.isPrivate();
      const isCommunity = convo.isPublic();

      switch (interactionType) {
        case ConversationInteractionType.Hide:
          // there is no text for hiding changes
          return '';
        case ConversationInteractionType.Leave:
          return isCommunity
            ? window.i18n('leaveCommunityFailed')
            : isGroup
              ? window.i18n('leaveGroupFailed')
              : window.i18n('deleteConversationFailed');
        default:
          assertUnreachable(
            interactionType,
            `Message.getDescription: Missing case error "${interactionType}"`
          );
      }
    }
  }

  window.log.error('formatInteractionNotification: Unsupported case');
  return null;
}

function formatCallNotification(
  callNotificationType: CallNotificationType,
  conversationId: string
) {
  const displayName = ConvoHub.use().getContactProfileNameOrShortenedPubKey(conversationId);

  if (callNotificationType === 'missed-call') {
    return window.i18n('callMissed', [displayName]);
  }
  if (callNotificationType === 'started-call') {
    return window.i18n('startedACall', [displayName]);
  }
  if (callNotificationType === 'answered-a-call') {
    return window.i18n('answeredACall', [displayName]);
  }
  window.log.error('formatCallNotification: Unsupported notification type');
  return null;
}

export type IdWithName = { sessionId: PubkeyType; name: string };

/**
 * When we are part of a change, we display the You first, and then others.
 * This function is used to check if we are part of the list.
 *  - if yes: returns {weArePart: true, others: changedWithoutUs}
 *  - if yes: returns {weArePart: false, others: changed}
 */
function moveUsToStart(
  changed: Array<IdWithName>,
  us: PubkeyType
): {
  sortedWithUsFirst: Array<IdWithName>;
} {
  const usAt = changed.findIndex(m => m.sessionId === us);
  if (usAt <= -1) {
    // we are not in it
    return { sortedWithUsFirst: changed };
  }
  const usItem = changed.at(usAt);
  if (!usItem) {
    throw new PreConditionFailed('"we" should have been there');
  }
  // deepClone because splice mutates the array
  const changedCopy = cloneDeep(changed);
  changedCopy.splice(usAt, 1);
  return { sortedWithUsFirst: [usItem, ...changedCopy] };
}

function changeOfMembersV2({
  changedWithNames,
  type,
  us,
}: {
  type: 'added' | 'addedWithHistory' | 'promoted' | 'removed';
  changedWithNames: Array<IdWithName>;
  us: PubkeyType;
}): string {
  const { sortedWithUsFirst } = moveUsToStart(changedWithNames, us);
  if (changedWithNames.length === 0) {
    throw new PreConditionFailed('change must always have an associated change');
  }
  const subject =
    sortedWithUsFirst.length === 1 && sortedWithUsFirst[0].sessionId === us
      ? 'You'
      : sortedWithUsFirst.length === 1
        ? 'One'
        : sortedWithUsFirst.length === 2
          ? 'Two'
          : 'Others';

  const action =
    type === 'addedWithHistory'
      ? 'JoinedWithHistory'
      : type === 'added'
        ? 'Joined'
        : type === 'promoted'
          ? 'Promoted'
          : ('Removed' as const);
  const key = `group${subject}${action}` as const;

  const sortedWithUsOrCount =
    subject === 'Others'
      ? [sortedWithUsFirst[0].name, (sortedWithUsFirst.length - 1).toString()]
      : sortedWithUsFirst.map(m => m.name);

  return window.i18n(key, sortedWithUsOrCount);
}

function mapIdsWithNames(changed: Array<PubkeyType>, names: Array<string>): Array<IdWithName> {
  if (!changed.length || !names.length) {
    throw new PreConditionFailed('mapIdsWithNames needs a change');
  }
  if (changed.length !== names.length) {
    throw new PreConditionFailed('mapIdsWithNames needs a the same length to map them together');
  }
  return changed.map((sessionId, index) => {
    return { sessionId, name: names[index] };
  });
}

export const FormatNotifications = {
  arrayContainsUsOnly,
  formatCallNotification,
  formatInteractionNotification,
  formatDataExtractionNotification,
  formatGroupUpdateNotification,
  changeOfMembersV2,
  mapIdsWithNames,
};
