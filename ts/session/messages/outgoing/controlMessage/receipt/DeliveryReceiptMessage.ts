import { SessionProtos } from '../../../../../protobuf';
import { ReceiptMessage } from './ReceiptMessage';

export class DeliveryReceiptMessage extends ReceiptMessage {
  public getReceiptType(): SessionProtos.ReceiptMessage.Type {
    return SessionProtos.ReceiptMessage.Type.DELIVERY;
  }
}
