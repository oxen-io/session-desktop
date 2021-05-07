import { Constants } from '../../../..';
import { SessionProtos } from '../../../../../protobuf';
import { ClosedGroupMessage } from './ClosedGroupMessage';

export class ClosedGroupMemberLeftMessage extends ClosedGroupMessage {
  public dataProto(): SessionProtos.DataMessage {
    const dataMessage = super.dataProto();

    // tslint:disable: no-non-null-assertion
    dataMessage.closedGroupControlMessage!.type =
      SessionProtos.DataMessage.ClosedGroupControlMessage.Type.MEMBER_LEFT;

    return dataMessage;
  }
}
