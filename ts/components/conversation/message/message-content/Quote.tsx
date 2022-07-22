import React, { useState, MouseEvent } from 'react';
import classNames from 'classnames';

import * as MIME from '../../../../../ts/types/MIME';
import * as GoogleChrome from '../../../../../ts/util/GoogleChrome';

import { useSelector } from 'react-redux';

import { noop } from 'lodash';
import { useDisableDrag } from '../../../../hooks/useDisableDrag';
import { useEncryptedFileFetch } from '../../../../hooks/useEncryptedFileFetch';
import { PubKey } from '../../../../session/types';
import {
  getSelectedConversationKey,
  isPublicGroupConversation,
} from '../../../../state/selectors/conversations';
import { ContactName } from '../../ContactName';
import { MessageBody } from './MessageBody';
import { useIsPrivate } from '../../../../hooks/useParamSelector';
import styled from 'styled-components';

const StyledQuoteAuthor = styled.div<{ isIncoming: boolean }>`
  color: ${props =>
    props.isIncoming ? `var(--color-received-message-text)` : `var(--color-sent-message-text)`};
  font-size: 13px;
  font-weight: bold;
  line-height: 18px;
  margin-bottom: 5px;

  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  .module-contact-name {
    font-weight: bold;
  }
`;

const StyledQuoteText = styled.div<{ isIncoming: boolean }>`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;

  font-size: 14px;
  line-height: 18px;
  color: ${props =>
    props.isIncoming ? 'var(--color-received-message-text)' : 'var(--color-sent-message-text)'};

  a {
    color: ${props =>
      props.isIncoming ? 'var(--color-received-message-text)' : 'var(--color-sent-message-text)'};
  }
`;

const StyledQuote = styled.div<{
  isIncoming: boolean;
  onClick: ((e: MouseEvent<HTMLDivElement>) => void) | undefined;
  referencedMessageNotFound: boolean;
}>`
  position: relative;

  cursor: ${props => (props.onClick ? 'pointer' : 'auto')};
  display: flex;
  flex-direction: row;
  align-items: ${props => (props.referencedMessageNotFound ? 'center' : 'stretch')};
  overflow: hidden;
  border-left: 4px solid ${props => (props.isIncoming ? 'var(--color-accent)' : 'black')};

  /* TODO not sure if this actually happens maybe we can remove it?  */
  /* Test by forcing the value to be true */
  ${props =>
    props.referencedMessageNotFound &&
    `
    height: 26px;
    background-color: rgba(white, 0.85);
    padding-inline-start: 8px;
    padding-inline-end: 8px;
    margin-inline-end: 8px;
  `}
`;

export type QuotePropsWithoutListener = {
  attachment?: QuotedAttachmentType;
  sender: string;
  authorProfileName?: string;
  authorName?: string;
  isFromMe: boolean;
  isIncoming: boolean;
  text: string | null;
  referencedMessageNotFound: boolean;
};

export type QuotePropsWithListener = QuotePropsWithoutListener & {
  id: string;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
};

export interface QuotedAttachmentType {
  contentType: MIME.MIMEType;
  fileName: string;
  /** Not included in protobuf */
  isVoiceMessage: boolean;
  thumbnail?: Attachment;
}

interface Attachment {
  contentType: MIME.MIMEType;
  /** Not included in protobuf, and is loaded asynchronously */
  objectUrl?: string;
}

function validateQuote(quote: QuotePropsWithoutListener): boolean {
  if (quote.text) {
    return true;
  }

  if (quote.attachment) {
    return true;
  }

  return false;
}

function getObjectUrl(thumbnail: Attachment | undefined): string | undefined {
  if (thumbnail && thumbnail.objectUrl) {
    return thumbnail.objectUrl;
  }

  return;
}

function getTypeLabel({
  contentType,
  isVoiceMessage,
}: {
  contentType: MIME.MIMEType;
  isVoiceMessage: boolean;
}): string | undefined {
  if (GoogleChrome.isVideoTypeSupported(contentType)) {
    return window.i18n('video');
  }
  if (GoogleChrome.isImageTypeSupported(contentType)) {
    return window.i18n('photo');
  }
  if (MIME.isAudio(contentType) && isVoiceMessage) {
    return window.i18n('voiceMessage');
  }
  if (MIME.isAudio(contentType)) {
    return window.i18n('audio');
  }

  return;
}

export const QuoteIcon = (props: any) => {
  const { icon } = props;

  return (
    <div className="module-quote__icon-container">
      <div className="module-quote__icon-container__inner">
        <div className="module-quote__icon-container__circle-background">
          <div
            className={classNames(
              'module-quote__icon-container__icon',
              `module-quote__icon-container__icon--${icon}`
            )}
          />
        </div>
      </div>
    </div>
  );
};

export const QuoteImage = (props: {
  handleImageErrorBound: () => void;
  url: string;
  contentType: string;
  icon?: string;
}) => {
  const { url, icon, contentType, handleImageErrorBound } = props;
  const disableDrag = useDisableDrag();

  const { loading, urlToLoad } = useEncryptedFileFetch(url, contentType, false);
  const srcData = !loading ? urlToLoad : '';

  const iconElement = icon ? (
    <div className="module-quote__icon-container__inner">
      <div className="module-quote__icon-container__circle-background">
        <div
          className={classNames(
            'module-quote__icon-container__icon',
            `module-quote__icon-container__icon--${icon}`
          )}
        />
      </div>
    </div>
  ) : null;

  return (
    <div className="module-quote__icon-container">
      <img
        src={srcData}
        alt={window.i18n('quoteThumbnailAlt')}
        onDragStart={disableDrag}
        onError={handleImageErrorBound}
      />
      {iconElement}
    </div>
  );
};

export const QuoteGenericFile = (
  props: Pick<QuotePropsWithoutListener, 'attachment' | 'isIncoming'>
) => {
  const { attachment, isIncoming } = props;

  if (!attachment) {
    return null;
  }

  const { fileName, contentType } = attachment;
  const isGenericFile =
    !GoogleChrome.isVideoTypeSupported(contentType) &&
    !GoogleChrome.isImageTypeSupported(contentType) &&
    !MIME.isAudio(contentType);

  if (!isGenericFile) {
    return null;
  }

  return (
    <div className="module-quote__generic-file">
      <div className="module-quote__generic-file__icon" />
      <div
        className={classNames(
          'module-quote__generic-file__text',
          isIncoming ? 'module-quote__generic-file__text--incoming' : null
        )}
      >
        {fileName}
      </div>
    </div>
  );
};

export const QuoteIconContainer = (
  props: Pick<QuotePropsWithoutListener, 'attachment'> & {
    handleImageErrorBound: () => void;
    imageBroken: boolean;
  }
) => {
  const { attachment, imageBroken, handleImageErrorBound } = props;

  if (!attachment) {
    return null;
  }

  const { contentType, thumbnail } = attachment;
  const objectUrl = getObjectUrl(thumbnail);

  if (GoogleChrome.isVideoTypeSupported(contentType)) {
    return objectUrl && !imageBroken ? (
      <QuoteImage
        url={objectUrl}
        contentType={MIME.IMAGE_JPEG}
        icon="play"
        handleImageErrorBound={noop}
      />
    ) : (
      <QuoteIcon icon="movie" />
    );
  }
  if (GoogleChrome.isImageTypeSupported(contentType)) {
    return objectUrl && !imageBroken ? (
      <QuoteImage
        url={objectUrl}
        contentType={contentType}
        handleImageErrorBound={handleImageErrorBound}
      />
    ) : (
      <QuoteIcon icon="image" />
    );
  }
  if (MIME.isAudio(contentType)) {
    return <QuoteIcon icon="microphone" />;
  }
  return null;
};

export const QuoteText = (
  props: Pick<QuotePropsWithoutListener, 'text' | 'attachment' | 'isIncoming'>
) => {
  const { text, attachment, isIncoming } = props;

  const convoId = useSelector(getSelectedConversationKey);
  const isGroup = useIsPrivate(convoId);

  if (text) {
    return (
      <StyledQuoteText dir="auto" isIncoming={isIncoming}>
        <MessageBody text={text} disableLinks={true} disableJumbomoji={true} isGroup={isGroup} />
      </StyledQuoteText>
    );
  }

  if (!attachment) {
    return null;
  }

  const { contentType, isVoiceMessage } = attachment;

  const typeLabel = getTypeLabel({ contentType, isVoiceMessage });
  if (typeLabel) {
    return (
      <div
        className={classNames(
          'module-quote__primary__type-label',
          isIncoming ? 'module-quote__primary__type-label--incoming' : null
        )}
      >
        {typeLabel}
      </div>
    );
  }

  return null;
};

type QuoteAuthorProps = {
  author: string;
  authorProfileName?: string;
  authorName?: string;
  isFromMe: boolean;
  isIncoming: boolean;
  showPubkeyForAuthor?: boolean;
};

const QuoteAuthor = (props: QuoteAuthorProps) => {
  const { authorProfileName, author, authorName, isFromMe, isIncoming } = props;

  return (
    <StyledQuoteAuthor isIncoming={isIncoming}>
      {isFromMe ? (
        window.i18n('you')
      ) : (
        <ContactName
          pubkey={PubKey.shorten(author)}
          name={authorName}
          profileName={authorProfileName}
          compact={true}
          shouldShowPubkey={Boolean(props.showPubkeyForAuthor)}
        />
      )}
    </StyledQuoteAuthor>
  );
};

export const QuoteReferenceWarning = (
  props: Pick<QuotePropsWithoutListener, 'isIncoming' | 'referencedMessageNotFound'>
) => {
  const { isIncoming, referencedMessageNotFound } = props;

  if (!referencedMessageNotFound) {
    return null;
  }

  return (
    <div
      className={classNames(
        'module-quote__reference-warning',
        isIncoming ? 'module-quote__reference-warning--incoming' : null
      )}
    >
      <div
        className={classNames(
          'module-quote__reference-warning__icon',
          isIncoming ? 'module-quote__reference-warning__icon--incoming' : null
        )}
      />
      <div
        className={classNames(
          'module-quote__reference-warning__text',
          isIncoming ? 'module-quote__reference-warning__text--incoming' : null
        )}
      >
        {window.i18n('originalMessageNotFound')}
      </div>
    </div>
  );
};

export const Quote = (props: QuotePropsWithListener) => {
  const [imageBroken, setImageBroken] = useState(false);
  const handleImageErrorBound = () => {
    setImageBroken(true);
  };

  const isPublic = useSelector(isPublicGroupConversation);

  if (!validateQuote(props)) {
    return null;
  }

  const { isIncoming, referencedMessageNotFound, attachment, text, onClick } = props;

  return (
    <div id={props.id} className={classNames('module-quote-container')}>
      <StyledQuote
        isIncoming={isIncoming}
        onClick={onClick}
        referencedMessageNotFound={referencedMessageNotFound}
      >
        <div className="module-quote__primary">
          <QuoteAuthor
            authorName={props.authorName}
            author={props.sender}
            authorProfileName={props.authorProfileName}
            isFromMe={props.isFromMe}
            isIncoming={props.isIncoming}
            showPubkeyForAuthor={isPublic}
          />
          <QuoteGenericFile {...props} />
          <QuoteText isIncoming={isIncoming} text={text} attachment={attachment} />
        </div>
        <QuoteIconContainer
          attachment={attachment}
          handleImageErrorBound={handleImageErrorBound}
          imageBroken={imageBroken}
        />
      </StyledQuote>
      <QuoteReferenceWarning
        isIncoming={isIncoming}
        referencedMessageNotFound={referencedMessageNotFound}
      />
    </div>
  );
};
