import type { DisappearingMessageConversationModeType } from '../../models/conversationTypes';
import { SignalService } from '../../protobuf';
import { assertUnreachable } from '../../types/sqlSharedTypes';

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

// TODO NOTE legacy is strictly used in the UI and is not a valid disappearing message mode
export const DisappearingMessageConversationModes: Array<DisappearingMessageConversationModeType> =
  [
    'off',
    'deleteAfterRead',
    'deleteAfterSend',
    // TODO legacy messages support will be removed in a future release
    'legacy',
  ];
