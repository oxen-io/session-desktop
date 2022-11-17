import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { replyToMessage } from '../../../../../interactions/conversationInteractions';
import {
  deleteMessagesById,
  deleteMessagesByIdForEveryone,
} from '../../../../../interactions/conversations/unsendingInteractions';
import { resetRightOverlayMode, setRightOverlayMode } from '../../../../../state/ducks/section';
import { useMessageDetailsProps } from '../../../../../state/selectors/messages';
import { useRightOverlayMode } from '../../../../../state/selectors/section';
import { useSelectedConversationKey } from '../../../../../state/selectors/selectedConversation';
import {
  getAlt,
  getThumbnailUrl,
  isImageAttachment,
  isVideoAttachment,
} from '../../../../../types/Attachment';
import { saveAttachmentToDisk } from '../../../../../util/attachmentsUtil';
import { Flex } from '../../../../basic/Flex';
import { SpacerLG } from '../../../../basic/Text';
import { PanelButtonGroup, PanelIconButton } from '../../../../buttons';
import { SessionIconButton } from '../../../../icon';
import { Image } from '../../../Image';
import { showLightboxFromAttachmentProps } from '../../../message/message-content/MessageAttachment';
import { Message } from '../../../message/message-item/Message';
import { StyledScrollContainer } from '../../RightPanel';
import { RightOverlayHeader } from '../RightOverlayHeader';
import { MessageInfoAuthor } from './AuthorContainer';

const StyledContainer = styled(Flex)`
  width: 100%;

  .session-button {
    font-weight: 500;
    min-width: 90px;
    width: fit-content;
    margin: 35px auto 0;
  }
`;

export const MessageInfoLabel = styled.label`
  font-weight: 700;
  font-size: 20px;
  font-family: inherit;
`;

const MessageInfoData = styled.div`
  font-weight: 400;
  font-size: 18px;
  font-family: inherit;
  user-select: text;
`;

const MessageInfosContainer = styled.div`
  display: flex;
  gap: var(--margins-lg);
  width: 100%;
  flex-direction: column;
  padding: var(--margins-lg);
`;

const LabelWithInfoContainer = styled.div`
  font-family: var(--font-default);

  // when in the messageINfos container we take the whole line
  ${MessageInfosContainer} & {
    width: 100%;
  }
`;

const LabelWithInfo = (props: { label: string; info: string }) => {
  return (
    <LabelWithInfoContainer>
      <MessageInfoLabel>{props.label}</MessageInfoLabel>
      <MessageInfoData>{props.info}</MessageInfoData>
    </LabelWithInfoContainer>
  );
};

// this prints something like this: "06:02 PM Tue, 15/11/2022"
const formatTimestamps = 'hh:mm A ddd, D/M/Y';

const MessageBodyContainer = styled.div`
  display: flex;
  align-items: center;
  align-self: flex-start;
  width: 95%;
  padding-inline: var(--margins-lg);
  justify-content: space-between;

  .module-message {
    max-width: 95%;
  }

  .module-image {
    align-self: center;
  }
`;

const MessageInfoPage = (props: { messageId: string }) => {
  const { messageId } = props;
  const messageDetailsProps = useMessageDetailsProps(messageId);
  const selectedConvoId = useSelectedConversationKey();
  const dispatch = useDispatch();

  if (!messageDetailsProps || !selectedConvoId) {
    return null;
  }
  const {
    serverId,
    timestamp,
    serverTimestamp,
    receivedAt,
    sender,
    messageHash,
    attachments,
  } = messageDetailsProps;

  const sent = `${window.i18n('sent')}:`;
  const received = `${window.i18n('received')}:`;
  const serverIdStr = window.i18n('serverId');
  const messageHashStr = window.i18n('messageHash');

  const hasServerId = serverId !== undefined;
  const hasMessageHash = !!messageHash;

  const sentAtStr = `${moment(timestamp || serverTimestamp).format(
    formatTimestamps
  )} (${timestamp || serverTimestamp})`;
  const receivedAtStr = `${moment(receivedAt).format(formatTimestamps)} (${receivedAt})`;
  const hasNextPage = Boolean(attachments?.length);

  const showNextPage = () => {
    dispatch(
      setRightOverlayMode({ type: 'message_info', params: { messageId, defaultAttachment: 0 } })
    );
  };

  return (
    <>
      <MessageBodyContainer>
        <SpacerLG />
        <Message messageId={messageId} isDetailView={true} />
        <PageButton visible={hasNextPage} onClick={showNextPage} rotation={270} />
      </MessageBodyContainer>
      <MessageInfosContainer>
        <LabelWithInfo label={sent} info={sentAtStr} />
        <LabelWithInfo label={received} info={receivedAtStr} />
        {hasServerId && <LabelWithInfo label={serverIdStr} info={`${serverId}`} />}
        {hasMessageHash && <LabelWithInfo label={messageHashStr} info={messageHash} />}
        <MessageInfoAuthor sender={sender} />

        <PanelButtonGroup>
          {messageDetailsProps.isDeletable && (
            <PanelIconButton
              text={window.i18n('deleteJustForMe')}
              disableBg={true}
              iconType="delete"
              dataTestId="delete-for-me-from-details"
              onClick={() => void deleteMessagesById([messageId], selectedConvoId)}
            />
          )}
          {messageDetailsProps.isDeletableForEveryone && (
            <PanelIconButton
              text={window.i18n('deleteForEveryone')}
              iconType="delete"
              dataTestId="delete-for-everyone-from-details"
              disableBg={true}
              onClick={() => void deleteMessagesByIdForEveryone([messageId], selectedConvoId)}
            />
          )}
          <PanelIconButton
            text={window.i18n('replyToMessage')}
            iconType="reply"
            disableBg={true}
            onClick={async () => {
              const foundIt = await replyToMessage(messageId);
              // close the overlay
              if (foundIt) {
                dispatch(resetRightOverlayMode());
              }
            }}
            dataTestId="reply-to-msg-from-details"
          />
        </PanelButtonGroup>
      </MessageInfosContainer>
    </>
  );
};

const PageButton = (props: { visible: boolean; rotation: number; onClick: () => void }) => {
  return props.visible ? (
    <SessionIconButton
      iconSize={'huge'}
      iconType="chevron"
      iconRotation={props.rotation}
      onClick={props.onClick}
      iconPadding={'5px'}
    />
  ) : (
    <SpacerLG />
  );
};

const AttachmentOnError = () => {
  return <>Could not be loaded</>;
};

const AttachmentsInfoPage = (props: { messageId: string; defaultAttachment: number }) => {
  const [isOnError, setIsOnError] = useState(false);
  const { messageId, defaultAttachment } = props;
  const messageDetailsProps = useMessageDetailsProps(messageId);
  const selectedConvoId = useSelectedConversationKey();
  const dispatch = useDispatch();

  useEffect(() => {
    // reset the onError state on change of messageId
    if (isOnError) {
      setIsOnError(false);
    }
  }, [messageId]);

  if (!messageDetailsProps || !selectedConvoId) {
    return null;
  }
  const { attachments, sender, timestamp, serverTimestamp } = messageDetailsProps;

  const attachmentsLength = attachments?.length || 0;

  const hasNextPage =
    Boolean(defaultAttachment === undefined && attachmentsLength) ||
    defaultAttachment < attachmentsLength - 1;
  const hasPreviousPage = defaultAttachment !== undefined; // if we are at `undefined`, we are at the sent/received screen. Otherwise, we have at least that screen before us

  const showNewPage = () => {
    dispatch(
      setRightOverlayMode({
        type: 'message_info',
        params: { messageId, defaultAttachment: defaultAttachment + 1 },
      })
    );
  };

  const showPreviousPage = () => {
    dispatch(
      setRightOverlayMode({
        type: 'message_info',
        params: { messageId, defaultAttachment: defaultAttachment === 0 ? undefined : 0 },
      })
    );
  };

  const attachmentToRender = attachments?.[defaultAttachment];
  const hasAttachment = !!attachmentToRender;

  const showLightbox = () => {
    if (attachments && hasAttachment) {
      void showLightboxFromAttachmentProps(messageId, attachmentToRender);
    }
  };

  const { fileName, contentType, fileSize, id: fileId, path: localFilePath, width, height } =
    attachmentToRender || {};

  const isVideo = hasAttachment && isVideoAttachment(attachmentToRender);
  const isImage = hasAttachment && isImageAttachment(attachmentToRender);

  const isImageOrVideo = isImage || isVideo;

  function onError() {
    console.warn('TODO');
  }

  return (
    <>
      <MessageBodyContainer>
        <PageButton visible={hasPreviousPage} onClick={showPreviousPage} rotation={90} />
        {isImageOrVideo && !isOnError && (
          <Image
            alt={getAlt(attachmentToRender)}
            attachment={attachmentToRender}
            playIconOverlay={isVideo}
            height={300}
            width={300}
            url={getThumbnailUrl(attachmentToRender)}
            attachmentIndex={0}
            onError={onError}
            softCorners={true}
            onClick={showLightbox}
          />
        )}
        {isOnError && <AttachmentOnError />}
        <PageButton visible={hasNextPage} onClick={showNewPage} rotation={270} />
      </MessageBodyContainer>
      <MessageInfosContainer>
        {!!fileId && <LabelWithInfo label={window.i18n('fileID')} info={`${fileId}`} />}
        {!!fileName && <LabelWithInfo label={window.i18n('fileName')} info={fileName} />}
        {!!contentType && <LabelWithInfo label={window.i18n('contentType')} info={contentType} />}
        {!!fileSize && <LabelWithInfo label={window.i18n('fileSize')} info={fileSize} />}
        {!!localFilePath && <LabelWithInfo label={window.i18n('filePath')} info={localFilePath} />}
        {Boolean(width && height) && (
          <LabelWithInfo label={window.i18n('resolution')} info={`${width}x${height}`} />
        )}
        <PanelButtonGroup>
          <PanelIconButton
            text={window.i18n('save')}
            disableBg={true}
            iconType="saveToDisk"
            dataTestId="save-attachment-from-details"
            onClick={() => {
              if (attachmentToRender) {
                void saveAttachmentToDisk({
                  conversationId: selectedConvoId,
                  messageSender: sender,
                  messageTimestamp: serverTimestamp || timestamp,
                  attachment: attachmentToRender,
                });
              }
            }}
          />
        </PanelButtonGroup>
      </MessageInfosContainer>
    </>
  );
};

export const OverlayMessageInfo = () => {
  const rightOverlay = useRightOverlayMode();
  const selectedConvoId = useSelectedConversationKey();
  const { messageId, defaultAttachment } = rightOverlay?.params || {};

  const messageDetailsProps = useMessageDetailsProps(messageId);

  if (!rightOverlay || rightOverlay.type !== 'message_info' || !messageId || !selectedConvoId) {
    return null;
  }

  if (!messageDetailsProps) {
    return null;
  }
  const { attachments } = messageDetailsProps;
  
  const showMessageInfoPage = defaultAttachment === undefined;

  return (
    <StyledScrollContainer>
      <StyledContainer container={true} flexDirection={'column'} alignItems={'center'}>
        <RightOverlayHeader title={window.i18n('messageInfo')} hideBackButton={true} />
        {showMessageInfoPage ? (
          <MessageInfoPage messageId={messageId} />
        ) : (
          <AttachmentsInfoPage defaultAttachment={defaultAttachment} messageId={messageId} />
        )}
        <SpacerLG />
      </StyledContainer>
    </StyledScrollContainer>
  );
};
