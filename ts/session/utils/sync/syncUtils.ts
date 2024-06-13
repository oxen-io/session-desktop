import { isEmpty, isNumber, toNumber } from 'lodash';
import { SignalService } from '../../../protobuf';
import { UserSyncJobDone } from '../../../shims/events';
import { ReleasedFeatures } from '../../../util/releaseFeature';

import { DisappearingMessageUpdate } from '../../disappearing_messages/types';
import { DataMessage } from '../../messages/outgoing';
import { ExpirationTimerUpdateMessage } from '../../messages/outgoing/controlMessage/ExpirationTimerUpdateMessage';
import { MessageRequestResponse } from '../../messages/outgoing/controlMessage/MessageRequestResponse';
import { UnsendMessage } from '../../messages/outgoing/controlMessage/UnsendMessage';
import {
  AttachmentPointerWithUrl,
  PreviewWithAttachmentUrl,
  Quote,
  VisibleMessage,
} from '../../messages/outgoing/visibleMessage/VisibleMessage';
import { UserSync } from '../job_runners/jobs/UserSyncJob';

export const forceSyncConfigurationNowIfNeeded = async (waitForMessageSent = false) => {
  await ReleasedFeatures.checkIsUserConfigFeatureReleased();
  return new Promise(resolve => {
    // if we hang for more than 20sec, force resolve this promise.
    setTimeout(() => {
      resolve(false);
    }, 20000);

    // the UserSync also handles dumping in to the DB if we do not need to push the data, but the dumping needs to be done even before the feature flag is true.
    void UserSync.queueNewJobIfNeeded().catch(e => {
      window.log.warn(
        'forceSyncConfigurationNowIfNeeded scheduling of jobs UserSync.queueNewJobIfNeeded failed with: ',
        e.message
      );
    });

    if (waitForMessageSent) {
      window.Whisper.events.once(UserSyncJobDone, () => {
        resolve(true);
      });
      return;
    }
    resolve(true);
  });
};

const buildSyncVisibleMessage = (
  identifier: string,
  dataMessage: SignalService.DataMessage,
  createAtNetworkTimestamp: number,
  syncTarget: string,
  expireUpdate?: DisappearingMessageUpdate
) => {
  const body = dataMessage.body || undefined;

  const wrapToUInt8Array = (buffer: any) => {
    if (!buffer) {
      return undefined;
    }
    if (buffer instanceof Uint8Array) {
      // Audio messages are already uint8Array
      return buffer;
    }
    return new Uint8Array(buffer.toArrayBuffer());
  };
  const attachments = (dataMessage.attachments || []).map(attachment => {
    const key = wrapToUInt8Array(attachment.key);
    const digest = wrapToUInt8Array(attachment.digest);

    return {
      ...attachment,
      key,
      digest,
    };
  }) as Array<AttachmentPointerWithUrl>;
  const quote = (dataMessage.quote as Quote) || undefined;
  const preview = (dataMessage.preview as Array<PreviewWithAttachmentUrl>) || [];
  const dataMessageExpireTimer = dataMessage.expireTimer;

  return new VisibleMessage({
    identifier,
    createAtNetworkTimestamp,
    attachments,
    body,
    quote,
    preview,
    syncTarget,
    expireTimer: expireUpdate?.expirationTimer || dataMessageExpireTimer,
    expirationType: expireUpdate?.expirationType || null,
  });
};

const buildSyncExpireTimerMessage = (
  identifier: string,
  createAtNetworkTimestamp: number,
  expireUpdate: DisappearingMessageUpdate,
  syncTarget: string
) => {
  const { expirationType, expirationTimer: expireTimer } = expireUpdate;

  return new ExpirationTimerUpdateMessage({
    identifier,
    createAtNetworkTimestamp,
    expirationType,
    expireTimer,
    syncTarget,
  });
};

export type SyncMessageType =
  | VisibleMessage
  | ExpirationTimerUpdateMessage
  | MessageRequestResponse
  | UnsendMessage;

export const buildSyncMessage = (
  identifier: string,
  data: DataMessage | SignalService.DataMessage,
  syncTarget: string,
  sentTimestamp: number,
  expireUpdate?: DisappearingMessageUpdate
): VisibleMessage | ExpirationTimerUpdateMessage | null => {
  if (
    (data as any).constructor.name !== 'DataMessage' &&
    !(data instanceof SignalService.DataMessage)
  ) {
    window?.log?.warn('buildSyncMessage with something else than a DataMessage');
  }

  const dataMessage = data instanceof DataMessage ? data.dataProto() : data;

  if (!sentTimestamp || !isNumber(sentTimestamp)) {
    throw new Error('Tried to build a sync message without a sentTimestamp');
  }
  // don't include our profileKey on syncing message. This is to be done through libsession now
  const timestamp = toNumber(sentTimestamp);

  if (
    dataMessage.flags === SignalService.DataMessage.Flags.EXPIRATION_TIMER_UPDATE &&
    !isEmpty(expireUpdate)
  ) {
    const expireTimerSyncMessage = buildSyncExpireTimerMessage(
      identifier,
      timestamp,
      expireUpdate,
      syncTarget
    );

    return expireTimerSyncMessage;
  }

  const visibleSyncMessage = buildSyncVisibleMessage(
    identifier,
    dataMessage,
    timestamp,
    syncTarget,
    expireUpdate
  );
  return visibleSyncMessage;
};
