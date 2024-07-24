import { GroupPubkeyType } from 'libsession_util_nodejs';
import { SignalService } from '../../../../../../protobuf';
import { GroupUpdateMessage, GroupUpdateMessageParams } from '../GroupUpdateMessage';

interface Params extends GroupUpdateMessageParams {
  groupPk: GroupPubkeyType;
  groupIdentitySeed: Uint8Array;
  groupName: string;
}

/**
 * GroupUpdatePromoteMessage is sent as a 1o1 message to the recipient, not through the group's swarm.
 */
export class GroupUpdatePromoteMessage extends GroupUpdateMessage {
  public readonly groupIdentitySeed: Params['groupIdentitySeed'];
  public readonly groupName: Params['groupName'];

  constructor(params: Params) {
    super(params);

    this.groupIdentitySeed = params.groupIdentitySeed;
    this.groupName = params.groupName;
    if (!this.groupIdentitySeed || this.groupIdentitySeed.length !== 32) {
      throw new Error('groupIdentitySeed must be set');
    }
    if (!this.groupName) {
      throw new Error('name must be set and not empty');
    }
  }

  public dataProto(): SignalService.DataMessage {
    const promoteMessage = new SignalService.GroupUpdatePromoteMessage({
      groupIdentitySeed: this.groupIdentitySeed,
      name: this.groupName,
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
