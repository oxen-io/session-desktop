import React from 'react';

import { isImageTypeSupported, isVideoTypeSupported } from '../../util/GoogleChrome';
import { Image } from './Image';
import { StagedGenericAttachment } from './StagedGenericAttachment';
import { StagedPlaceholderAttachment } from './StagedPlaceholderAttachment';
import { areAllAttachmentsVisual, AttachmentType, isVideoAttachment } from '../../types/Attachment';
import { useDispatch, useSelector } from 'react-redux';
import {
  removeAllStagedAttachmentsInConversation,
  removeStagedAttachmentInConversation,
} from '../../state/ducks/stagedAttachments';
import { getSelectedConversationKey } from '../../state/selectors/conversations';
import { getStagedAttachmentsForCurrentConversation } from '../../state/selectors/stagedAttachments';

type Props = {
  onClickAttachment: (attachment: AttachmentType) => void;
  onAddAttachment: () => void;
};

const IMAGE_WIDTH = 120;
const IMAGE_HEIGHT = 120;

export const StagedAttachmentList = (props: Props) => {
  const { onAddAttachment, onClickAttachment } = props;

  const conversationKey = useSelector(getSelectedConversationKey);

  const stagedAttachments = useSelector(getStagedAttachmentsForCurrentConversation);

  const dispatch = useDispatch();
  const onDeleteAllStaged = () => {
    if (conversationKey) {
      dispatch(removeAllStagedAttachmentsInConversation({ conversationKey }));
    }
  };

  const onDeleteOneAttachment = (fullPath: string) => {
    if (!conversationKey || !fullPath) {
      return;
    }
    window.inboxStore?.dispatch(
      removeStagedAttachmentInConversation({
        conversationKey,
        fullPath,
      })
    );
  };

  if (!stagedAttachments || !stagedAttachments.length) {
    return null;
  }

  const allVisualAttachments = areAllAttachmentsVisual(stagedAttachments);

  return (
    <div className="module-attachments">
      {stagedAttachments.length > 1 ? (
        <div className="module-attachments__header">
          <div
            role="button"
            onClick={onDeleteAllStaged}
            className="module-attachments__close-button"
          />
        </div>
      ) : null}
      <div className="module-attachments__rail">
        {stagedAttachments.map((attachment, index) => {
          const { contentType } = attachment;
          const key = attachment.fullPath || index;

          if (isImageTypeSupported(contentType) || isVideoTypeSupported(contentType)) {
            const clickCallback = stagedAttachments.length > 1 ? onClickAttachment : undefined;

            return (
              <Image
                key={key}
                alt={window.i18n('stagedImageAttachment', [attachment.fileName])}
                attachment={attachment}
                softCorners={true}
                playIconOverlay={isVideoAttachment(attachment)}
                height={IMAGE_HEIGHT}
                width={IMAGE_WIDTH}
                url={attachment.objectUrl}
                closeButton={true}
                onClick={clickCallback}
                onClickClose={() => {
                  onDeleteOneAttachment(attachment.fullPath);
                }}
              />
            );
          }

          return (
            <StagedGenericAttachment
              key={key}
              attachment={attachment}
              onClose={() => {
                onDeleteOneAttachment(attachment.fullPath);
              }}
            />
          );
        })}
        {allVisualAttachments ? <StagedPlaceholderAttachment onClick={onAddAttachment} /> : null}
      </div>
    </div>
  );
};
