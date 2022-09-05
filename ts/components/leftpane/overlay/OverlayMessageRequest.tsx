import React from 'react';
// tslint:disable: no-submodule-imports use-simple-attributes

import { SpacerLG } from '../../basic/Text';
import { useDispatch, useSelector } from 'react-redux';
import { getConversationRequests } from '../../../state/selectors/conversations';
import { MemoConversationListItemWithDetails } from '../conversation-list-item/ConversationListItem';
import styled from 'styled-components';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../../basic/SessionButton';
import { SectionType, setOverlayMode, showLeftPaneSection } from '../../../state/ducks/section';
import { getConversationController } from '../../../session/conversations';
import { forceSyncConfigurationNowIfNeeded } from '../../../session/utils/syncUtils';
import useKey from 'react-use/lib/useKey';
import { resetConversationExternal } from '../../../state/ducks/conversations';
import { updateConfirmModal } from '../../../state/ducks/modalDialog';

export const OverlayMessageRequest = () => {
  useKey('Escape', closeOverlay);
  const dispatch = useDispatch();
  function closeOverlay() {
    dispatch(setOverlayMode(undefined));
  }
  const convoRequestCount = useSelector(getConversationRequests).length;
  const messageRequests = useSelector(getConversationRequests);

  const buttonText = window.i18n('clearAll');

  /**
   * Blocks all message request conversations and synchronizes across linked devices
   * @returns void
   */
  function handleClearAllRequestsClick() {
    const { i18n } = window;
    const title = i18n('clearAllConfirmationTitle');
    const message = i18n('clearAllConfirmationBody');
    const onClose = dispatch(updateConfirmModal(null));

    dispatch(
      updateConfirmModal({
        title,
        message,
        onClose,
        onClickOk: async () => {
          window?.log?.info('Marking all conversations as unapproved');
          if (!messageRequests?.length) {
            window?.log?.info('No conversation requests to mark unapproved.');
            return;
          }

          for (const convoRequest of messageRequests) {
            const { id } = convoRequest;
            const convoModel = getConversationController().get(id);
            if (convoModel) {
              // we mark the conversation as inactive. This way it wont' show up in the UI.
              // we cannot delete it completely on desktop, because we might need the convo details for sogs/group convos.

              await convoModel.setIsApproved(false, false);
              convoModel.set('active_at', undefined);
              await convoModel.commit();
            }
          }

          dispatch(setOverlayMode(undefined));
          dispatch(showLeftPaneSection(SectionType.Message));
          dispatch(resetConversationExternal());
          void forceSyncConfigurationNowIfNeeded();
        },
      })
    );
  }

  return (
    <div className="module-left-pane-overlay">
      {convoRequestCount ? (
        <>
          <MessageRequestList />
          <SpacerLG />
          <SessionButton
            buttonColor={SessionButtonColor.Danger}
            buttonType={SessionButtonType.BrandOutline}
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

const MessageRequestListPlaceholder = styled.div`
  color: var(--color-text);
  margin-bottom: auto;
`;

const MessageRequestListContainer = styled.div`
  width: 100%;
  overflow-y: auto;
  border: var(--border-session);
  margin-bottom: auto;
`;

/**
 * A request needs to be be unapproved and not blocked to be valid.
 * @returns List of message request items
 */
const MessageRequestList = () => {
  const conversationRequests = useSelector(getConversationRequests);
  return (
    <MessageRequestListContainer>
      {conversationRequests.map(conversation => {
        return (
          <MemoConversationListItemWithDetails
            key={conversation.id}
            isMessageRequest={true}
            {...conversation}
          />
        );
      })}
    </MessageRequestListContainer>
  );
};
