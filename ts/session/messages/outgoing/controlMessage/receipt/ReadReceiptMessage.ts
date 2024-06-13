import { ContentMessage } from '../..';
import { SignalService } from '../../../../../protobuf';
import { MessageParams } from '../../Message';

interface ReadReceiptMessageParams extends MessageParams {
  timestamps: Array<number>;
}
export class ReadReceiptMessage extends ContentMessage {
  public readonly timestamps: Array<number>;

  constructor({ createAtNetworkTimestamp, identifier, timestamps }: ReadReceiptMessageParams) {
    super({ createAtNetworkTimestamp, identifier });
    this.timestamps = timestamps;
  }

  public contentProto(): SignalService.Content {
    return new SignalService.Content({
      receiptMessage: this.receiptProto(),
    });
  }

  protected receiptProto(): SignalService.ReceiptMessage {
    return new SignalService.ReceiptMessage({
      type: SignalService.ReceiptMessage.Type.READ,
      timestamp: this.timestamps,
    });
  }
}
