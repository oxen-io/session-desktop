import { GroupPubkeyType } from 'libsession_util_nodejs';
import { LibSodiumWrappers } from '../../../../crypto';
import { DataMessage } from '../../DataMessage';
import { ExpirableMessageParams } from '../../ExpirableMessage';

export type AdminSigDetails = {
  secretKey: Uint8Array;
  sodium: LibSodiumWrappers;
};

export interface GroupUpdateMessageParams extends ExpirableMessageParams {
  groupPk: GroupPubkeyType;
}

export abstract class GroupUpdateMessage extends DataMessage {
  public readonly destination: GroupUpdateMessageParams['groupPk'];

  constructor(params: GroupUpdateMessageParams) {
    super(params);

    this.destination = params.groupPk;
    if (!this.destination || this.destination.length === 0) {
      throw new Error('destination must be set to the groupPubkey');
    }
  }

  // do not override the dataProto here, we want it to be defined in the child classes
  // public abstract dataProto(): SignalService.DataMessage;

  public abstract isFor1o1Swarm(): boolean;
  public abstract isForGroupSwarm(): boolean;
}
