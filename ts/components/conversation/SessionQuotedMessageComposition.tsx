import React, { useCallback, useEffect, useState } from 'react';
import { SessionIcon, SessionIconButton } from '../icon';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { quoteMessage } from '../../state/ducks/conversations';
import { getQuotedMessage } from '../../state/selectors/conversations';
import { getAlt, isAudio } from '../../types/Attachment';
import { AUDIO_MP3 } from '../../types/MIME';
import { Flex } from '../basic/Flex';
import { Image } from '../../../ts/components/conversation/Image';
import { fetchQuotedMessage } from './message/message-content/MessageQuote';
import { getAbsoluteAttachmentPath } from '../../types/MessageAttachment';
import { isEqual } from 'lodash';

const QuotedMessageComposition = styled.div`
  width: 100%;
  padding-inline-end: var(--margins-md);
  padding-inline-start: var(--margins-md);
`;

const QuotedMessageCompositionReply = styled.div`
  background: var(--color-quote-bottom-bar-background);
  border-radius: var(--margins-sm);
  padding: var(--margins-xs);
  box-shadow: var(--color-session-shadow);
  margin: var(--margins-xs);
`;

const Subtle = styled.div`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  color: var(--color-text);
`;

const ReplyingTo = styled.div`
  color: var(--color-text);
`;

export const SessionQuotedMessageComposition = () => {
  const quotedMessageProps = useSelector(getQuotedMessage);

  const dispatch = useDispatch();

  const { id, author, timestamp } = quotedMessageProps || {};

  const [quoteText, setQuoteText] = useState('');
  const [imageAttachment, setImageAttachment] = useState(undefined);
  const [hasAudioAttachment, setHasAudioAttachment] = useState(false);

  const removeQuotedMessage = useCallback(() => {
    dispatch(quoteMessage(undefined));
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (author && timestamp) {
      fetchQuotedMessage(author, timestamp)
        .then(async result => {
          if (isCancelled) {
            return;
          }

          if (result) {
            if (result.attachments && result.attachments[0]) {
              if (!isEqual(imageAttachment, result.attachments[0])) {
                setImageAttachment(
                  result.attachments[0].contentType !== AUDIO_MP3 && result.attachments[0].thumbnail
                    ? result.attachments[0]
                    : undefined
                );

                const hasAudio = isAudio(result.attachments);
                setHasAudioAttachment(
                  hasAudio !== false && hasAudio !== undefined && hasAudio !== ''
                );
              }
            } else {
              setImageAttachment(undefined);
              setHasAudioAttachment(false);
            }

            if (result.text && !isEqual(quoteText, result.text)) {
              setQuoteText(result.text);
            }
          }
        })
        .catch(() => {
          if (isCancelled) {
            return;
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [author, fetchQuotedMessage, timestamp, hasAudioAttachment, imageAttachment, quoteText]);

  if (!id || !author || !timestamp) {
    return null;
  }

  return (
    <QuotedMessageComposition>
      <Flex
        container={true}
        justifyContent="space-between"
        flexGrow={1}
        margin={'var(--margins-xs)'}
      >
        <ReplyingTo>{window.i18n('replyingToMessage')}</ReplyingTo>
        <SessionIconButton iconType="exit" iconSize="small" onClick={removeQuotedMessage} />
      </Flex>
      <QuotedMessageCompositionReply>
        <Flex container={true} justifyContent="space-between" margin={'var(--margins-xs)'}>
          <Subtle>
            {(imageAttachment && window.i18n('mediaMessage')) || (quoteText !== '' && quoteText)}
          </Subtle>

          {imageAttachment && (
            <Image
              alt={getAlt(imageAttachment)}
              attachment={imageAttachment}
              height={100}
              width={100}
              url={getAbsoluteAttachmentPath((imageAttachment as any).thumbnail.path)}
            />
          )}

          {hasAudioAttachment && <SessionIcon iconType="microphone" iconSize="huge" />}
        </Flex>
      </QuotedMessageCompositionReply>
    </QuotedMessageComposition>
  );
};
