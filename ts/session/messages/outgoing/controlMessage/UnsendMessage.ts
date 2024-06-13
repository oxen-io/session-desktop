import { SignalService } from '../../../../protobuf';
import { ContentMessage } from '../ContentMessage';
import { MessageParams } from '../Message';

interface UnsendMessageParams extends MessageParams {
  author: string;
}

export class UnsendMessage extends ContentMessage {
  private readonly author: string;

  constructor(params: UnsendMessageParams) {
    super({
      createAtNetworkTimestamp: params.createAtNetworkTimestamp,
      author: params.author,
    } as MessageParams);
    this.author = params.author;
  }

  public contentProto(): SignalService.Content {
    return new SignalService.Content({
      unsendMessage: this.unsendProto(),
    });
  }

  public unsendProto(): SignalService.Unsend {
    return new SignalService.Unsend({
      timestamp: this.createAtNetworkTimestamp,
      author: this.author,
    });
  }
}
