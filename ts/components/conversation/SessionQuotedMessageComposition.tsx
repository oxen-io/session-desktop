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
import { getConversationController } from '../../session/conversations';
import { PubKey } from '../../session/types';

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

const StyledImage = styled.div`
  div {
    border-radius: 4px;
    overflow: hidden;
  }
`;

const StyledText = styled(Flex)`
  margin: 0 10px;

  p {
    font-weight: bold;
    margin: 0 0 4px;
  }
`;

export const SessionQuotedMessageComposition = () => {
  const quotedMessageProps = useSelector(getQuotedMessage);

  const dispatch = useDispatch();

  const { id, author, timestamp, convoId } = quotedMessageProps || {};

  const [isReady, setIsReady] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [quoteText, setQuoteText] = useState('');
  const [imageAttachment, setImageAttachment] = useState(undefined);
  const [hasAudioAttachment, setHasAudioAttachment] = useState(false);

  const removeQuotedMessage = useCallback(() => {
    dispatch(quoteMessage(undefined));
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (convoId) {
      const conversationModel = getConversationController().get(convoId);
      setIsGroup(conversationModel.isGroup());
    }

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

            if (
              result.authorName &&
              result.authorName !== '' &&
              !isEqual(authorName, result.authorName)
            ) {
              setAuthorName(result.authorName);
            }
            setIsReady(true);
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
      setIsReady(false);
    };
  }, [
    convoId,
    author,
    authorName,
    fetchQuotedMessage,
    timestamp,
    hasAudioAttachment,
    imageAttachment,
    quoteText,
  ]);

  if (!id || !author || !timestamp) {
    return null;
  }

  if (!isReady) {
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
        <Flex
          container={true}
          justifyContent="flex-start"
          alignItems="center"
          margin={'var(--margins-xs)'}
        >
          {imageAttachment && (
            <StyledImage>
              <Image
                alt={getAlt(imageAttachment)}
                attachment={imageAttachment}
                height={100}
                width={100}
                url={getAbsoluteAttachmentPath((imageAttachment as any).thumbnail.path)}
              />
            </StyledImage>
          )}
          <StyledText
            container={true}
            flexDirection="column"
            justifyContent={'center'}
            alignItems={'flex-start'}
          >
            {/* NOTE should merge after the ID blinding PR since it includes the updated shorten method i.e. (0553...1234) */}
            {isGroup && (
              <p>
                {authorName !== '' && `${authorName} `}
                {PubKey.shorten(author)}
              </p>
            )}
            <Subtle>
              {(imageAttachment && window.i18n('mediaMessage')) || (quoteText !== '' && quoteText)}
            </Subtle>
          </StyledText>

          {hasAudioAttachment && <SessionIcon iconType="microphone" iconSize="huge" />}
        </Flex>
      </QuotedMessageCompositionReply>
    </QuotedMessageComposition>
  );
};
