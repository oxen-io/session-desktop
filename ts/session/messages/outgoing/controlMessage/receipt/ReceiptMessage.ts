import { SessionProtos } from '../../../../../protobuf';
import { MessageParams } from '../../Message';
import { Constants } from '../../../..';
import { ContentMessage } from '../..';

interface ReceiptMessageParams extends MessageParams {
  timestamps: Array<number>;
}
export abstract class ReceiptMessage extends ContentMessage {
  public readonly timestamps: Array<number>;

  constructor({ timestamp, identifier, timestamps }: ReceiptMessageParams) {
    super({ timestamp, identifier });
    this.timestamps = timestamps;
  }

  public abstract getReceiptType(): SessionProtos.ReceiptMessage.Type;

  public contentProto(): SessionProtos.Content {
    return new SessionProtos.Content({
      receiptMessage: this.receiptProto(),
    });
  }

  protected receiptProto(): SessionProtos.ReceiptMessage {
    return new SessionProtos.ReceiptMessage({
      type: this.getReceiptType(),
      timestamp: this.timestamps,
    });
  }
}
