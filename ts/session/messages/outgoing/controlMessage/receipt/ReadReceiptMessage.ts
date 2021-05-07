import { SessionProtos } from '../../../../../protobuf';
import { ReceiptMessage } from './ReceiptMessage';

export class ReadReceiptMessage extends ReceiptMessage {
  public getReceiptType(): SessionProtos.ReceiptMessage.Type {
    return SessionProtos.ReceiptMessage.Type.READ;
  }
}
