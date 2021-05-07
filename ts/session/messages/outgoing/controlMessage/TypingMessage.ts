import { SessionProtos } from '../../../../protobuf';
import { MessageParams } from '../Message';
import { Constants } from '../../..';
import { ContentMessage } from '..';

interface TypingMessageParams extends MessageParams {
  isTyping: boolean;
  typingTimestamp?: number;
}

export class TypingMessage extends ContentMessage {
  public readonly isTyping: boolean;
  public readonly typingTimestamp?: number;

  constructor(params: TypingMessageParams) {
    super({ timestamp: params.timestamp, identifier: params.identifier });
    this.isTyping = params.isTyping;
    this.typingTimestamp = params.typingTimestamp;
  }

  public ttl(): number {
    return Constants.TTL_DEFAULT.TYPING_MESSAGE;
  }

  public contentProto(): SessionProtos.Content {
    return new SessionProtos.Content({
      typingMessage: this.typingProto(),
    });
  }

  protected typingProto(): SessionProtos.TypingMessage {
    const ACTION_ENUM = SessionProtos.TypingMessage.Action;

    const action = this.isTyping ? ACTION_ENUM.STARTED : ACTION_ENUM.STOPPED;
    const finalTimestamp = this.typingTimestamp || Date.now();

    const typingMessage = new SessionProtos.TypingMessage();
    typingMessage.action = action;
    typingMessage.timestamp = finalTimestamp;

    return typingMessage;
  }
}
