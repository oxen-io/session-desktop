import { ContentMessage } from '..';
import { Constants } from '../../..';
import { SignalService } from '../../../../protobuf';
import { MessageParams } from '../Message';

interface TypingMessageParams extends MessageParams {
  isTyping: boolean;
}

export class TypingMessage extends ContentMessage {
  public readonly isTyping: boolean;

  constructor(params: TypingMessageParams) {
    super({
      createAtNetworkTimestamp: params.createAtNetworkTimestamp,
      identifier: params.identifier,
    });
    this.isTyping = params.isTyping;
  }

  public ttl(): number {
    return Constants.TTL_DEFAULT.TYPING_MESSAGE;
  }

  public contentProto(): SignalService.Content {
    return new SignalService.Content({
      typingMessage: this.typingProto(),
    });
  }

  protected typingProto(): SignalService.TypingMessage {
    const action = this.isTyping
      ? SignalService.TypingMessage.Action.STARTED
      : SignalService.TypingMessage.Action.STOPPED;

    const typingMessage = new SignalService.TypingMessage();
    typingMessage.action = action;
    typingMessage.timestamp = this.createAtNetworkTimestamp;

    return typingMessage;
  }
}
