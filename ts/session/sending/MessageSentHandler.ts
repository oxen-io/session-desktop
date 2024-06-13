import { union } from 'lodash';
import { Data } from '../../data/data';
import { SignalService } from '../../protobuf';
import { DisappearingMessages } from '../disappearing_messages';
import { OpenGroupVisibleMessage } from '../messages/outgoing/visibleMessage/OpenGroupVisibleMessage';
import { OutgoingRawMessage, PubKey } from '../types';
import { UserUtils } from '../utils';

async function handlePublicMessageSentSuccess(
  sentMessageIdentifier: string,
  result: { serverId: number; serverTimestamp: number }
) {
  const { serverId, serverTimestamp } = result;

  try {
    const foundMessage = await fetchHandleMessageSentData(sentMessageIdentifier);

    if (!foundMessage) {
      throw new Error(
        'handlePublicMessageSentSuccess(): The message should be in memory for an openGroup message'
      );
    }

    // serverTimestamp can be a fractional number where first part is seconds and second part is nanosecs depending on the pysogs version.

    foundMessage.set({
      serverTimestamp,
      serverId,
      isPublic: true,
      sent: true,
      sent_at: serverTimestamp, // we quote by sent_at, so we MUST sent_at: serverTimestamp
      sync: true,
      synced: true,
      sentSync: true,
    });
    await foundMessage.commit();
    foundMessage.getConversation()?.updateLastMessage();
  } catch (e) {
    window?.log?.error('Error setting public on message');
  }
}

async function handlePublicMessageSentFailure(sentMessage: OpenGroupVisibleMessage, error: any) {
  const fetchedMessage = await fetchHandleMessageSentData(sentMessage.identifier);
  if (!fetchedMessage) {
    return;
  }

  if (error instanceof Error) {
    await fetchedMessage.saveErrors(error);
  }

  // always mark the message as sent.
  // the fact that we have errors on the sent is based on the saveErrors()
  fetchedMessage.set({
    sent: true,
  });

  await fetchedMessage.commit();
  await fetchedMessage.getConversation()?.updateLastMessage();
}

async function handleSwarmMessageSentSuccess(
  {
    device: destination,
    identifier,
    isDestinationClosedGroup,
    plainTextBuffer,
  }: Pick<OutgoingRawMessage, 'device' | 'identifier'> & {
    /**
     * plainTextBuffer is only required when sending a message to a 1o1,
     * as we need it to encrypt it again for our linked devices (synced messages)
     */
    plainTextBuffer: Uint8Array | null;
    /**
     * We must not sync a message when it was sent to a closed group
     */
    isDestinationClosedGroup: boolean;
  },
  effectiveTimestamp: number,
  storedHash: string | null
) {
  // The wrappedEnvelope will be set only if the message is not one of OpenGroupV2Message type.
  let fetchedMessage = await fetchHandleMessageSentData(identifier);
  if (!fetchedMessage) {
    return;
  }

  let sentTo = fetchedMessage.get('sent_to') || [];

  const isOurDevice = UserUtils.isUsFromCache(destination);

  const isClosedGroupMessage = isDestinationClosedGroup || PubKey.is03Pubkey(destination);

  // We trigger a sync message only when the message is not to one of our devices, AND
  // the message is not for a group (there is no sync for groups, each device pulls all messages), AND
  // if we did not sync or trigger a sync message for this specific message already
  const shouldTriggerSyncMessage =
    !isOurDevice &&
    !isClosedGroupMessage &&
    !fetchedMessage.get('synced') &&
    !fetchedMessage.get('sentSync');

  // A message is synced if we triggered a sync message (sentSync)
  // and the current message was sent to our device (so a sync message)
  const shouldMarkMessageAsSynced =
    (isOurDevice && fetchedMessage.get('sentSync')) || isClosedGroupMessage;

  // Handle the sync logic here
  if (shouldTriggerSyncMessage && plainTextBuffer) {
    try {
      const contentDecoded = SignalService.Content.decode(plainTextBuffer);
      if (contentDecoded && contentDecoded.dataMessage) {
        try {
          await fetchedMessage.sendSyncMessage(contentDecoded, effectiveTimestamp);
          const tempFetchMessage = await fetchHandleMessageSentData(identifier);
          if (!tempFetchMessage) {
            window?.log?.warn(
              'Got an error while trying to sendSyncMessage(): fetchedMessage is null'
            );
            return;
          }
          fetchedMessage = tempFetchMessage;
        } catch (e) {
          window?.log?.warn('Got an error while trying to sendSyncMessage():', e);
        }
      }
    } catch (e) {
      window.log.info(
        'failed to decode content (excpected except if message was for a 1o1 as we need it to send the sync message'
      );
    }
  } else if (shouldMarkMessageAsSynced) {
    fetchedMessage.set({ synced: true });
  }

  sentTo = union(sentTo, [destination]);
  if (storedHash) {
    fetchedMessage.updateMessageHash(storedHash);
  }

  fetchedMessage.set({
    sent_to: sentTo,
    sent: true,
    sent_at: effectiveTimestamp,
  });

  DisappearingMessages.checkForExpiringOutgoingMessage(fetchedMessage, 'handleMessageSentSuccess');

  await fetchedMessage.commit();
  fetchedMessage.getConversation()?.updateLastMessage();
}

async function handleSwarmMessageSentFailure(
  sentMessage: Pick<OutgoingRawMessage, 'device' | 'identifier'>,
  error: any
) {
  const fetchedMessage = await fetchHandleMessageSentData(sentMessage.identifier);
  if (!fetchedMessage) {
    return;
  }

  if (error instanceof Error) {
    await fetchedMessage.saveErrors(error);
  }

  const isOurDevice = UserUtils.isUsFromCache(sentMessage.device);
  // if this message was for ourself, and it was not already synced,
  // it means that we failed to sync it.
  // so just remove the flag saying that we are currently sending the sync message
  if (isOurDevice && !fetchedMessage.get('sync')) {
    fetchedMessage.set({ sentSync: false });
  }

  // always mark the message as sent.
  // the fact that we have errors on the sent is based on the saveErrors()
  fetchedMessage.set({
    sent: true,
  });

  // Disappeared messages that fail to send should not disappear
  if (fetchedMessage.getExpirationType() && fetchedMessage.getExpireTimerSeconds() > 0) {
    fetchedMessage.set({
      expirationStartTimestamp: undefined,
    });
    window.log.warn(
      `[handleSwarmMessageSentFailure] Stopping a message from disppearing until we retry the send operation. messageId: ${fetchedMessage.get(
        'id'
      )}`
    );
  }

  await fetchedMessage.commit();
  await fetchedMessage.getConversation()?.updateLastMessage();
}

/**
 * This function tries to find a message by messageId by first looking on the MessageController.
 * The MessageController holds all messages being in memory.
 * Those are the messages sent recently, received recently, or the one shown to the user.
 *
 * If the app restarted, it's very likely those messages won't be on the memory anymore.
 * In this case, this function will look for it in the database and return it.
 * If the message is found on the db, it will also register it to the MessageController so our subsequent calls are quicker.
 */
async function fetchHandleMessageSentData(messageIdentifier: string) {
  const dbMessage = await Data.getMessageById(messageIdentifier);

  if (!dbMessage) {
    return null;
  }
  return dbMessage;
}

export const MessageSentHandler = {
  handlePublicMessageSentSuccess,
  handlePublicMessageSentFailure,
  handleSwarmMessageSentFailure,
  handleSwarmMessageSentSuccess,
};
