import { ContentMessage } from '.';
import { SessionProtos } from '../../../protobuf';
import { TTL_DEFAULT } from '../../constants';

export abstract class DataMessage extends ContentMessage {
  public abstract dataProto(): SessionProtos.DataMessage;

  public contentProto(): SessionProtos.Content {
    return new SessionProtos.Content({
      dataMessage: this.dataProto(),
    });
  }
}
