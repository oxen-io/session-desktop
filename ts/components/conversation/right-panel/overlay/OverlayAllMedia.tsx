import _, { compact, flatten, isEqual } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useInterval } from 'react-use';
import styled from 'styled-components';
import { Data } from '../../../../data/data';
import { Constants } from '../../../../session';
import { getSelectedConversation } from '../../../../state/selectors/conversations';
import { getRightOverlayMode } from '../../../../state/selectors/section';
import { AttachmentTypeWithPath } from '../../../../types/Attachment';
import { getAbsoluteAttachmentPath } from '../../../../types/MessageAttachment';
import { Flex } from '../../../basic/Flex';
import { SpacerLG } from '../../../basic/Text';
import { MediaItemType } from '../../../lightbox/LightboxGallery';
import { MediaGallery } from '../../media-gallery/MediaGallery';
import { RightOverlayHeader } from './RightOverlayHeader';

const StyledScrollContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden auto;
`;

const StyledContainer = styled(Flex)`
  width: 100%;

  .session-button {
    font-weight: 500;
    min-width: 90px;
    width: fit-content;
    margin: 35px auto 0;
  }
`;

export const OverlayAllMedia = () => {
  const [documents, setDocuments] = useState<Array<MediaItemType>>([]);
  const [media, setMedia] = useState<Array<MediaItemType>>([]);
  const rightOverlay = useSelector(getRightOverlayMode);

  const selectedConversation = useSelector(getSelectedConversation);

  useEffect(() => {
    let isRunning = true;

    if (selectedConversation) {
      void getMediaGalleryProps(selectedConversation.id).then(results => {
        if (isRunning) {
          if (!isEqual(documents, results.documents)) {
            setDocuments(results.documents);
          }

          if (!isEqual(media, results.media)) {
            setMedia(results.media);
          }
        }
      });
    }

    return () => {
      isRunning = false;
      return;
    };
  }, []);

  useInterval(async () => {
    if (selectedConversation) {
      const results = await getMediaGalleryProps(selectedConversation.id);
      if (results.documents.length !== documents.length || results.media.length !== media.length) {
        setDocuments(results.documents);
        setMedia(results.media);
      }
    }
  }, 10000);

  if (!rightOverlay || rightOverlay.type !== 'show_media') {
    return null;
  }
  return (
    <StyledScrollContainer>
      <StyledContainer container={true} flexDirection={'column'} alignItems={'center'}>
        <RightOverlayHeader title={window.i18n('allMedia')} hideBackButton={false} />
        <MediaGallery documents={documents} media={media} />
        <SpacerLG />
      </StyledContainer>
    </StyledScrollContainer>
  );
};

async function getMediaGalleryProps(
  conversationId: string
): Promise<{
  documents: Array<MediaItemType>;
  media: Array<MediaItemType>;
}> {
  // We fetch more documents than media as they don’t require to be loaded
  // into memory right away. Revisit this once we have infinite scrolling:
  const rawMedia = await Data.getMessagesWithVisualMediaAttachments(
    conversationId,
    Constants.CONVERSATION.DEFAULT_MEDIA_FETCH_COUNT
  );
  const rawDocuments = await Data.getMessagesWithFileAttachments(
    conversationId,
    Constants.CONVERSATION.DEFAULT_DOCUMENTS_FETCH_COUNT
  );

  const media = flatten(
    rawMedia.map(attributes => {
      const { attachments, source, id, timestamp, serverTimestamp, received_at } = attributes;

      return (attachments || [])
        .filter(
          (attachment: AttachmentTypeWithPath) =>
            attachment.thumbnail && !attachment.pending && !attachment.error
        )
        .map((attachment: AttachmentTypeWithPath, index: number) => {
          const { thumbnail } = attachment;

          const mediaItem: MediaItemType = {
            objectURL: getAbsoluteAttachmentPath(attachment.path),
            thumbnailObjectUrl: thumbnail ? getAbsoluteAttachmentPath(thumbnail.path) : undefined,
            contentType: attachment.contentType || '',
            index,
            messageTimestamp: timestamp || serverTimestamp || received_at || 0,
            messageSender: source,
            messageId: id,
            attachment,
          };

          return mediaItem;
        });
    })
  );

  // Unlike visual media, only one non-image attachment is supported
  const documents = rawDocuments.map(attributes => {
    // this is to not fail if the attachment is invalid (could be a Long Attachment type which is not supported)
    if (!attributes.attachments?.length) {
      // window?.log?.info(
      //   'Got a message with an empty list of attachment. Skipping...'
      // );
      return null;
    }
    const attachment = attributes.attachments[0];
    const { source, id, timestamp, serverTimestamp, received_at } = attributes;

    return {
      contentType: attachment.contentType,
      index: 0,
      attachment,
      messageTimestamp: timestamp || serverTimestamp || received_at || 0,
      messageSender: source,
      messageId: id,
    };
  });

  return {
    media,
    documents: compact(documents), // remove null
  };
}
