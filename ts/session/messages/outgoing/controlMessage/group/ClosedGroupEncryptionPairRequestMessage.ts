import { Constants } from '../../../..';
import { SessionProtos } from '../../../../../protobuf';
import { ClosedGroupMessage } from './ClosedGroupMessage';

export class ClosedGroupEncryptionPairRequestMessage extends ClosedGroupMessage {
  public dataProto(): SessionProtos.DataMessage {
    throw new Error('ClosedGroupEncryptionPairRequestMessage: This is unused for now ');
    const dataMessage = super.dataProto();

    // tslint:disable: no-non-null-assertion
    dataMessage.closedGroupControlMessage!.type =
      SessionProtos.DataMessage.ClosedGroupControlMessage.Type.ENCRYPTION_KEY_PAIR_REQUEST;

    return dataMessage;
  }
}
