import { Message } from '.';
import { SessionProtos } from '../../../protobuf';
import { TTL_DEFAULT } from '../../constants';

export abstract class ContentMessage extends Message {
  public plainTextBuffer(): Uint8Array {
    return SessionProtos.Content.encode(this.contentProto()).finish();
  }

  public ttl(): number {
    return TTL_DEFAULT.TTL_MAX;
  }
  public abstract contentProto(): SessionProtos.Content;
}
