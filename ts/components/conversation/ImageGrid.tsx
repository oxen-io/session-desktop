import React, { useContext } from 'react';

import {
  areAllAttachmentsVisual,
  AttachmentType,
  AttachmentTypeWithPath,
  getAlt,
  getThumbnailUrl,
  isVideoAttachment,
} from '../../types/Attachment';

import { Image } from './Image';
import { IsMessageVisibleContext } from './message/message-content/MessageContent';
import styled from 'styled-components';
import { THUMBNAIL_SIDE } from '../../types/attachments/VisualAttachment';

type Props = {
  attachments: Array<AttachmentTypeWithPath>;
  onError: () => void;
  onClickAttachment?: (attachment: AttachmentTypeWithPath | AttachmentType) => void;
};

const StyledImageGrid = styled.div<{ flexDirection: 'row' | 'column' }>`
  display: inline-flex;
  align-items: center;
  gap: var(--margins-sm);
  flex-direction: ${props => props.flexDirection};
`;
// tslint:disable: cyclomatic-complexity max-func-body-length use-simple-attributes

const Row = (
  props: Props & { renderedSize: number; startIndex: number; totalAttachmentsCount: number; overlaySet?: boolean; }
) => {
  const {
    attachments,
    onError,
    renderedSize,
    startIndex,
    onClickAttachment,
    totalAttachmentsCount,
    overlaySet
  } = props;
  const isMessageVisible = useContext(IsMessageVisibleContext);
  const moreMessagesOverlay = totalAttachmentsCount > 5;
  const moreMessagesOverlayText = moreMessagesOverlay ? `+${totalAttachmentsCount - 5}` : undefined;

  return (
    <>
      {attachments.map((attachment, index) => {
        const showOverlay = index === 1 && moreMessagesOverlay && overlaySet;
        return (
          <Image
            alt={getAlt(attachment)}
            attachment={attachment}
            playIconOverlay={isVideoAttachment(attachment)}
            height={renderedSize}
            key={attachment.id}
            width={renderedSize}
            url={isMessageVisible ? getThumbnailUrl(attachment) : undefined}
            attachmentIndex={startIndex + index}
            onClick={onClickAttachment}
            onError={onError}
            softCorners={true}
            darkOverlay={showOverlay}
            overlayText={showOverlay ? moreMessagesOverlayText : undefined}
          />
        );
      })}
    </>
  );
};

export const ImageGrid = (props: Props) => {
  const { attachments, onError, onClickAttachment } = props;

  if (!attachments || !attachments.length) {
    return null;
  }

  if (attachments.length === 1 || !areAllAttachmentsVisual(attachments)) {
    return (
      <StyledImageGrid flexDirection={'row'}>
        <Row
          attachments={attachments.slice(0, 1)}
          onError={onError}
          onClickAttachment={onClickAttachment}
          renderedSize={THUMBNAIL_SIDE}
          startIndex={0}
          totalAttachmentsCount={attachments.length}
        />
      </StyledImageGrid>
    );
  }

  if (attachments.length <= 3) {
    // For 2 or 3 attachments, we render them side by side with the full size of
    // THUMBNAIL_SIDE.
    return (
      <StyledImageGrid flexDirection={'row'}>
        <Row
          attachments={attachments.slice(0, 3)}
          onError={onError}
          onClickAttachment={onClickAttachment}
          renderedSize={THUMBNAIL_SIDE}
          startIndex={0}
          totalAttachmentsCount={attachments.length}
        />
      </StyledImageGrid>
    );
  }

  const columnImageSide = THUMBNAIL_SIDE / 2 - 5;

  // For 4 or 5 attachments, we render the final 2 in a column after the 3rd.
  // If we have more than 5, the 5th one becomes the overlay.
  return (
    <StyledImageGrid flexDirection={'row'}>
      <Row
        attachments={attachments.slice(0, 3)}
        onError={onError}
        onClickAttachment={onClickAttachment}
        renderedSize={THUMBNAIL_SIDE}
        startIndex={0}
        totalAttachmentsCount={attachments.length}
      />

      <StyledImageGrid flexDirection={'column'}>
        <Row
          attachments={attachments.slice(3, 5)}
          onError={onError}
          onClickAttachment={onClickAttachment}
          renderedSize={columnImageSide}
          startIndex={3}
          totalAttachmentsCount={attachments.length}
          overlaySet={true}
        />
      </StyledImageGrid>
    </StyledImageGrid>
  );
}
