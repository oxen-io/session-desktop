import { DisappearingMessageConversationModeType } from '../../models/conversationTypes';
import { SignalService } from '../../protobuf';
import { assertUnreachable } from '../../types/sqlSharedTypes';

export type DisappearingMessageType =
  | 'unknown'
  | Exclude<DisappearingMessageConversationModeType, 'off' | 'legacy'>;

export function incomingExpirationTypeToDisappearingMessageType(
  expirationType: SignalService.Content.ExpirationType
) {
  switch (expirationType) {
    case SignalService.Content.ExpirationType.UNKNOWN:
      return 'unknown';
    case SignalService.Content.ExpirationType.DELETE_AFTER_READ:
      return 'deleteAfterRead';
    case SignalService.Content.ExpirationType.DELETE_AFTER_SEND:
      return 'deleteAfterSend';
    default: {
      assertUnreachable(
        expirationType,
        'incomingExpirationTypeToDisappearingMessageType should have been handled for this case'
      );
      // tsc needs this for the returnType of this current conversation to be required
      throw new Error('Missing case error');
    }
  }
}
export type DisappearAfterSendOnly = Exclude<DisappearingMessageType, 'deleteAfterRead'>;

// TODO NOTE legacy is strictly used in the UI and is not a valid disappearing message mode
export const DisappearingMessageConversationModes: Array<DisappearingMessageConversationModeType> =
  [
    'off',
    'deleteAfterRead',
    'deleteAfterSend',
    // TODO legacy messages support will be removed in a future release
    'legacy',
  ];

// TODO legacy messages support will be removed in a future release
// expirationType will no longer have an undefined option
/** Used for setting disappearing messages in conversations */
export type ExpirationTimerUpdate = {
  expirationType: DisappearingMessageType | undefined;
  expireTimer: number;
  source: string;
  /** updated setting from another device */
  fromSync?: boolean;
};

export type DisappearingMessageUpdate = {
  expirationType: DisappearingMessageType;
  expirationTimer: number;
  // This is used for the expirationTimerUpdate
  // TODO legacy messages support will be removed in a future release
  isLegacyConversationSettingMessage?: boolean;
  isLegacyDataMessage?: boolean;
  isDisappearingMessagesV2Released?: boolean;
  messageExpirationFromRetrieve: number | null;
};

export type ReadyToDisappearMsgUpdate = Pick<
  DisappearingMessageUpdate,
  'expirationType' | 'expirationTimer' | 'messageExpirationFromRetrieve'
>;
