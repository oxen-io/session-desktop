import { SignalService } from '../../../../protobuf';
import { DataMessage } from '../DataMessage';
import { ExpirableMessageParams } from '../ExpirableMessage';

interface GroupInvitationMessageParams extends ExpirableMessageParams {
  url: string;
  name: string;
}

export class GroupInvitationMessage extends DataMessage {
  private readonly url: string;
  private readonly name: string;

  constructor(params: GroupInvitationMessageParams) {
    super({
      createAtNetworkTimestamp: params.createAtNetworkTimestamp,
      identifier: params.identifier,
      expirationType: params.expirationType,
      expireTimer: params.expireTimer,
    });
    this.url = params.url;
    this.name = params.name;
  }

  public dataProto(): SignalService.DataMessage {
    const openGroupInvitation = new SignalService.DataMessage.OpenGroupInvitation({
      url: this.url,
      name: this.name,
    });

    return new SignalService.DataMessage({
      openGroupInvitation,
    });
  }
}
