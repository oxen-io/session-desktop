import chai, { expect } from 'chai';
import Sinon, { useFakeTimers } from 'sinon';
import { handleMessageReaction, sendMessageReaction } from '../../../../util/reactions';
import * as Data from '../../../../../ts/data/data';
import * as Storage from '../../../../util/storage';
import { generateFakeIncomingPrivateMessage, stubWindowLog } from '../../../test-utils/utils';
import { RECENT_REACTS } from '../../../../session/constants';
import { noop } from 'lodash';
import { UserUtils } from '../../../../session/utils';
import { SignalService } from '../../../../protobuf';
import { MessageCollection } from '../../../../models/message';

chai.use(require('chai-as-promised'));

describe('ReactionMessage', () => {
  stubWindowLog();

  let clock: Sinon.SinonFakeTimers;
  const ourNumber = '0123456789abcdef';
  const originalMessage = generateFakeIncomingPrivateMessage();

  originalMessage.set('sent_at', Date.now());
  Sinon.stub(originalMessage, 'getConversation').returns({
    sendReaction: noop,
  } as any);

  // sendMessageReaction stubs
  Sinon.stub(Data, 'getMessageById').resolves(originalMessage);
  Sinon.stub(Storage, 'getRecentReactions').resolves(RECENT_REACTS);
  Sinon.stub(Storage, 'saveRecentReations').resolves();
  Sinon.stub(UserUtils, 'getOurPubKeyStrFromCache').returns(ourNumber);

  // handleMessageReaction stubs
  Sinon.stub(Data, 'getMessagesBySentAt').resolves(new MessageCollection([originalMessage]));
  Sinon.stub(originalMessage, 'commit').resolves();

  it('can react to a message', async () => {
    // Send reaction
    const reaction = await sendMessageReaction(originalMessage.get('id'), '😄');

    expect(reaction?.id, 'id should match the original message timestamp').to.be.equal(
      Number(originalMessage.get('sent_at'))
    );
    expect(reaction?.author, 'author should match the original message author').to.be.equal(
      originalMessage.get('source')
    );
    expect(reaction?.emoji, 'emoji should be 😄').to.be.equal('😄');
    expect(reaction?.action, 'action should be 0').to.be.equal(0);

    // Handling reaction
    const updatedMessage = await handleMessageReaction(
      reaction as SignalService.DataMessage.IReaction,
      ourNumber,
      originalMessage.get('id')
    );

    expect(updatedMessage?.get('reacts'), 'original message should have reacts').to.not.be
      .undefined;
    expect(updatedMessage?.get('reacts')!['😄'], 'reacts should have 😄 key').to.not.be.undefined;
    expect(
      Object.keys(updatedMessage!.get('reacts')!['😄'])[0],
      'sender pubkey should match'
    ).to.be.equal(ourNumber);

    // TODO The reaction should be added to the most recent reactions [make sync first]
  });

  it('can remove a reaction from a message', async () => {
    // Send reaction
    const reaction = await sendMessageReaction(originalMessage.get('id'), '😄');

    expect(reaction?.id, 'id should match the original message timestamp').to.be.equal(
      Number(originalMessage.get('sent_at'))
    );
    expect(reaction?.author, 'author should match the original message author').to.be.equal(
      originalMessage.get('source')
    );
    expect(reaction?.emoji, 'emoji should be 😄').to.be.equal('😄');
    expect(reaction?.action, 'action should be 1').to.be.equal(1);

    // Handling reaction
    const updatedMessage = await handleMessageReaction(
      reaction as SignalService.DataMessage.IReaction,
      ourNumber,
      originalMessage.get('id')
    );

    expect(updatedMessage?.get('reacts'), 'original message reacts should be undefined').to.be
      .undefined;
  });

  it('reactions are rate limited to 20 reactions per minute', async () => {
    // we have already sent 2 messages when this test runs
    for (let i = 0; i < 18; i++) {
      // Send reaction
      await sendMessageReaction(originalMessage.get('id'), '👍');
    }

    let reaction = await sendMessageReaction(originalMessage.get('id'), '👎');

    expect(reaction, 'no reaction should be returned since we are over the rate limit').to.be
      .undefined;

    clock = useFakeTimers(Date.now());

    // Wait a miniute for the rate limit to clear
    clock.tick(1 * 60 * 1000);

    reaction = await sendMessageReaction(originalMessage.get('id'), '👋');

    expect(reaction?.id, 'id should match the original message timestamp').to.be.equal(
      Number(originalMessage.get('sent_at'))
    );
    expect(reaction?.author, 'author should match the original message author').to.be.equal(
      originalMessage.get('source')
    );
    expect(reaction?.emoji, 'emoji should be 👋').to.be.equal('👋');
    expect(reaction?.action, 'action should be 0').to.be.equal(0);
    clock.restore();
  });

  it('a moderator can batch clear a reaction in an open group', () => {
    // TODO Requires Open Group end point integration
  });
});