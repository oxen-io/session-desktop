import { expect } from 'chai';

import { v4 as uuid } from 'uuid';
import { SignalService } from '../../../protobuf';
import { ContentMessage, TypingMessage } from '../../../session/messages/outgoing';
import { TextEncoder } from 'util';


export class ExampleMessage extends ContentMessage {
  constructor() {
    super({
      timestamp: Math.floor(Math.random() * 10000000000000),
      identifier: uuid(),
    });
  }

  public ttl(): number {
    // throw new Error("Method not implemented.");
    return 5;
  }

  protected contentProto(): SignalService.Content {
    // throw new Error("Method not implemented.");

    // TODO - get actual content
    const content = SignalService.Content.create();

    return content;
  }
}




describe('TypingMessage', () => {
    it('has Action.STARTED if isTyping = true', () => {
        const message = new TypingMessage({
            timestamp: Date.now(),
            identifier: '123456',
            isTyping: true,
        });
        const plainText = message.plainTextBuffer();
        const decoded = SignalService.Content.toObject(SignalService.Content.decode(plainText));
        expect(decoded.typingMessage).to.have.property('action', SignalService.TypingMessage.Action.STARTED);
    });

    it('has Action.STOPPED if isTyping = false', () => {
        const message = new TypingMessage({
            timestamp: Date.now(),
            identifier: '123456',
            isTyping: false,
        });
        const plainText = message.plainTextBuffer();
        const decoded = SignalService.Content.toObject(SignalService.Content.decode(plainText));
        expect(decoded.typingMessage).to.have.property('action', SignalService.TypingMessage.Action.STOPPED);
    });

    it('has typingTimestamp set if value passed', () => {
        const message = new TypingMessage({
            timestamp: Date.now(),
            identifier: '123456',
            isTyping: true,
            typingTimestamp: 111111111,
        });
        const plainText = message.plainTextBuffer();
        const decoded = SignalService.Content.toObject(SignalService.Content.decode(plainText));
        const typingTimestamp = decoded.typingMessage.timestamp.toNumber();
        expect(typingTimestamp).to.be.equal(111111111);
    });

    it('has typingTimestamp set with Date.now() if value not passed', () => {
        const message = new TypingMessage({
            timestamp: Date.now(),
            identifier: '123456',
            isTyping: true,
        });
        const plainText = message.plainTextBuffer();
        const decoded = SignalService.Content.toObject(SignalService.Content.decode(plainText));
        const typingTimestamp = decoded.typingMessage.timestamp.toNumber();
        expect(typingTimestamp).to.be.equal(Date.now());
    });

    it('has groupId set if a value given', () => {
        const groupId = '6666666666';
        const message = new TypingMessage({
            timestamp: Date.now(),
            identifier: '123456',
            isTyping: true,
            groupId,
        });
        const plainText = message.plainTextBuffer();
        const decoded = SignalService.Content.toObject(SignalService.Content.decode(plainText));
        const manuallyEncodedGroupId = new TextEncoder().encode(groupId);

        expect(decoded.typingMessage.groupId).to.be.deep.equal(manuallyEncodedGroupId);
    });

    it('ttl of 1 minute', () => {
        const message = new TypingMessage({
            timestamp: Date.now(),
            identifier: '123456',
            isTyping: true,
        });
        expect(message.ttl()).to.equal(60 * 1000);
    });
});
