import moment from 'moment';
import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { useMessageDetailsPropsById } from '../../../../../hooks/useParamSelector';
import { replyToMessage } from '../../../../../interactions/conversationInteractions';
import {
  deleteMessagesById,
  deleteMessagesByIdForEveryone,
} from '../../../../../interactions/conversations/unsendingInteractions';
import { getSelectedConversationKey } from '../../../../../state/selectors/conversations';
import { getRightOverlayMode } from '../../../../../state/selectors/section';
import { Flex } from '../../../../basic/Flex';
import { SpacerLG } from '../../../../basic/Text';
import { PanelButtonGroup, PanelIconButton } from '../../../../buttons';
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
  align-self: flex-start;
  width: 95%;

  .module-message {
    max-width: 95%;
  }
`;

export const OverlayMessageInfo = () => {
  const rightOverlay = useSelector(getRightOverlayMode);
  const selectedConvoId = useSelector(getSelectedConversationKey);
  const { messageId } = rightOverlay?.params || {};

  const messageDetailsProps = useMessageDetailsPropsById(messageId);

  if (!rightOverlay || rightOverlay.type !== 'message_info' || !messageId || !selectedConvoId) {
    return null;
  }

  if (!messageDetailsProps) {
    return null;
  }
  const {
    serverId,
    timestamp,
    serverTimestamp,
    receivedAt,
    sender,
    messageHash,
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

  return (
    <StyledScrollContainer>
      <StyledContainer container={true} flexDirection={'column'} alignItems={'center'}>
        <RightOverlayHeader title={window.i18n('messageInfo')} hideBackButton={true} />
        <MessageBodyContainer>
          <Message messageId={messageId} isDetailView={true} />
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
              ></PanelIconButton>
            )}
            {messageDetailsProps.isDeletableForEveryone && (
              <PanelIconButton
                text={window.i18n('deleteForEveryone')}
                iconType="delete"
                dataTestId="delete-for-everyone-from-details"
                disableBg={true}
                onClick={() => void deleteMessagesByIdForEveryone([messageId], selectedConvoId)}
              ></PanelIconButton>
            )}
            <PanelIconButton
              text={window.i18n('replyToMessage')}
              iconType="reply"
              disableBg={true}
              onClick={() => void replyToMessage(messageId)}
              dataTestId="reply-to-msg-from-details"
            ></PanelIconButton>
          </PanelButtonGroup>
        </MessageInfosContainer>
        <SpacerLG />
      </StyledContainer>
    </StyledScrollContainer>
  );
};
