import { GroupPubkeyType } from 'libsession_util_nodejs';
import { SignalService } from '../../../../../../protobuf';
import { GroupUpdateMessage, GroupUpdateMessageParams } from '../GroupUpdateMessage';

interface Params extends GroupUpdateMessageParams {
  groupPk: GroupPubkeyType;
  groupIdentitySeed: Uint8Array;
}

/**
 * GroupUpdatePromoteMessage is sent as a 1o1 message to the recipient, not through the group's swarm.
 */
export class GroupUpdatePromoteMessage extends GroupUpdateMessage {
  public readonly groupIdentitySeed: Params['groupIdentitySeed'];

  constructor(params: Params) {
    super(params);

    this.groupIdentitySeed = params.groupIdentitySeed;
    if (!this.groupIdentitySeed || this.groupIdentitySeed.length !== 32) {
      throw new Error('groupIdentitySeed must be set');
    }
  }

  public dataProto(): SignalService.DataMessage {
    const promoteMessage = new SignalService.GroupUpdatePromoteMessage({
      groupIdentitySeed: this.groupIdentitySeed,
    });

    return new SignalService.DataMessage({
      groupUpdateMessage: { promoteMessage },
    });
  }

  public isForGroupSwarm(): boolean {
    return false;
  }
  public isFor1o1Swarm(): boolean {
    return true;
  }
}
