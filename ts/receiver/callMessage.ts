import { toNumber } from 'lodash';
import { SignalService } from '../protobuf';
import { GetNetworkTime } from '../session/apis/snode_api/getNetworkTime';
import { TTL_DEFAULT } from '../session/constants';
import { CallManager, UserUtils } from '../session/utils';
import { WithMessageHash, WithOptExpireUpdate } from '../session/utils/calling/CallManager';
import { IncomingMessageCache } from './cache';
import { EnvelopePlus } from './types';

// messageHash & messageHash are only needed for actions adding a callMessage to the database (so they expire)
export async function handleCallMessage(
  envelope: EnvelopePlus,
  callMessage: SignalService.CallMessage,
  expireDetails: WithOptExpireUpdate & WithMessageHash
) {
  const { Type } = SignalService.CallMessage;
  const sender = envelope.senderIdentity || envelope.source;

  const sentTimestamp = toNumber(envelope.timestamp);

  const { type } = callMessage;

  // we just allow self send of ANSWER/END_CALL message to remove the incoming call dialog when we accepted it from another device
  if (
    sender === UserUtils.getOurPubKeyStrFromCache() &&
    callMessage.type !== Type.ANSWER &&
    callMessage.type !== Type.END_CALL
  ) {
    window.log.info('Dropping incoming call from ourself');
    await IncomingMessageCache.removeFromCache(envelope);
    return;
  }

  if (CallManager.isCallRejected(callMessage.uuid)) {
    await IncomingMessageCache.removeFromCache(envelope);

    window.log.info(`Dropping already rejected call from this device ${callMessage.uuid}`);
    return;
  }

  if (type === Type.PROVISIONAL_ANSWER || type === Type.PRE_OFFER) {
    await IncomingMessageCache.removeFromCache(envelope);
    return;
  }

  if (type === Type.OFFER) {
    if (Math.max(sentTimestamp - GetNetworkTime.now()) > TTL_DEFAULT.CALL_MESSAGE) {
      window?.log?.info('Dropping incoming OFFER callMessage sent a while ago: ', sentTimestamp);
      await IncomingMessageCache.removeFromCache(envelope);

      return;
    }
    await IncomingMessageCache.removeFromCache(envelope);

    await CallManager.handleCallTypeOffer(sender, callMessage, sentTimestamp, expireDetails);

    return;
  }

  if (type === SignalService.CallMessage.Type.END_CALL) {
    await IncomingMessageCache.removeFromCache(envelope);

    await CallManager.handleCallTypeEndCall(sender, callMessage.uuid);

    return;
  }

  if (type === SignalService.CallMessage.Type.ANSWER) {
    await IncomingMessageCache.removeFromCache(envelope);

    await CallManager.handleCallTypeAnswer(sender, callMessage, sentTimestamp, expireDetails);

    return;
  }
  if (type === SignalService.CallMessage.Type.ICE_CANDIDATES) {
    await IncomingMessageCache.removeFromCache(envelope);

    await CallManager.handleCallTypeIceCandidates(sender, callMessage, sentTimestamp);

    return;
  }
  await IncomingMessageCache.removeFromCache(envelope);

  // if this another type of call message, just add it to the manager
  await CallManager.handleOtherCallTypes(sender, callMessage, sentTimestamp);
}
