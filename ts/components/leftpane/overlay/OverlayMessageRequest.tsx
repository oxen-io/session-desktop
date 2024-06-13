import React from 'react';

import { useDispatch, useSelector } from 'react-redux';
import useKey from 'react-use/lib/useKey';
import styled from 'styled-components';
import { declineConversationWithoutConfirm } from '../../../interactions/conversationInteractions';
import { forceSyncConfigurationNowIfNeeded } from '../../../session/utils/sync/syncUtils';
import { updateConfirmModal } from '../../../state/ducks/modalDialog';
import { resetLeftOverlayMode } from '../../../state/ducks/section';
import { getConversationRequestsIds } from '../../../state/selectors/conversations';
import { useSelectedConversationKey } from '../../../state/selectors/selectedConversation';
import { SessionButton, SessionButtonColor } from '../../basic/SessionButton';
import { SpacerLG } from '../../basic/Text';
import { ConversationListItem } from '../conversation-list-item/ConversationListItem';
import { ed25519Str } from '../../../session/utils/String';

const MessageRequestListPlaceholder = styled.div`
  color: var(--conversation-tab-text-color);
  margin-bottom: auto;
`;

const MessageRequestListContainer = styled.div`
  width: 100%;
  overflow-y: auto;
  margin-bottom: auto;
`;

/**
 * A request needs to be be unapproved and not blocked to be valid.
 * @returns List of message request items
 */
const MessageRequestList = () => {
  const conversationRequests = useSelector(getConversationRequestsIds);
  return (
    <MessageRequestListContainer>
      {conversationRequests.map(conversationId => {
        return <ConversationListItem key={conversationId} conversationId={conversationId} />;
      })}
    </MessageRequestListContainer>
  );
};

export const OverlayMessageRequest = () => {
  useKey('Escape', closeOverlay);
  const dispatch = useDispatch();
  function closeOverlay() {
    dispatch(resetLeftOverlayMode());
  }

  const currentlySelectedConvo = useSelectedConversationKey();
  const messageRequests = useSelector(getConversationRequestsIds);
  const hasRequests = messageRequests.length;

  const buttonText = window.i18n('clearAll');

  /**
   * Blocks all message request conversations and synchronizes across linked devices
   * @returns void
   */
  function handleClearAllRequestsClick() {
    const { i18n } = window;
    const title = i18n('clearAll');
    const message = i18n('clearAllConfirmationBody');
    const onClose = dispatch(updateConfirmModal(null));

    dispatch(
      updateConfirmModal({
        title,
        message,
        onClose,
        okTheme: SessionButtonColor.Danger,
        closeTheme: SessionButtonColor.Primary,
        okText: window.i18n('clear'),
        onClickOk: async () => {
          window?.log?.info('Blocking all message requests');
          if (!hasRequests) {
            window?.log?.info('No conversation requests to block.');
            return;
          }

          for (let index = 0; index < messageRequests.length; index++) {
            const convoId = messageRequests[index];
            try {
              // eslint-disable-next-line no-await-in-loop
              await declineConversationWithoutConfirm({
                alsoBlock: false,
                conversationId: convoId,
                currentlySelectedConvo,
                syncToDevices: false,
                conversationIdOrigin: null, // block is false, no need for conversationIdOrigin
              });
            } catch (e) {
              window.log.warn(
                `failed to decline msg request ${ed25519Str(convoId)} with error: ${e.message}`
              );
            }
          }

          await forceSyncConfigurationNowIfNeeded();
        },
        onClickClose: () => {
          window.inboxStore?.dispatch(updateConfirmModal(null));
        },
      })
    );
  }

  return (
    <div className="module-left-pane-overlay">
      {hasRequests ? (
        <>
          <MessageRequestList />
          <SpacerLG />
          <SessionButton
            buttonColor={SessionButtonColor.Danger}
            text={buttonText}
            onClick={handleClearAllRequestsClick}
          />
        </>
      ) : (
        <>
          <SpacerLG />
          <MessageRequestListPlaceholder>
            {window.i18n('noMessageRequestsPending')}
          </MessageRequestListPlaceholder>
        </>
      )}
    </div>
  );
};
