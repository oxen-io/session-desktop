import { SessionProtos } from '../../../../../protobuf';
import { PubKey } from '../../../../types';
import { DataMessage } from '../../DataMessage';
import { MessageParams } from '../../Message';

export interface ClosedGroupMessageParams extends MessageParams {
  groupId: string | PubKey;
  expireTimer: number;
}

export abstract class ClosedGroupMessage extends DataMessage {
  public readonly groupId: PubKey;
  public readonly expireTimer: number;

  constructor(params: ClosedGroupMessageParams) {
    super({
      timestamp: params.timestamp,
      identifier: params.identifier,
    });

    this.groupId = PubKey.cast(params.groupId);
    this.expireTimer = params.expireTimer;
    if (!this.groupId || this.groupId.key.length === 0) {
      throw new Error('groupId must be set');
    }
  }

  public static areAdminsMembers(admins: Array<string>, members: Array<string>) {
    return admins.every(a => members.includes(a));
  }

  public dataProto(): SessionProtos.DataMessage {
    const dataMessage = new SessionProtos.DataMessage();

    dataMessage.closedGroupControlMessage = new SessionProtos.DataMessage.ClosedGroupControlMessage();
    dataMessage.expireTimer = this.expireTimer;

    return dataMessage;
  }
}
