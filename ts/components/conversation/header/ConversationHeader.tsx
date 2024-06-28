import React from 'react';

import { useDispatch, useSelector } from 'react-redux';
import {
  getReturnToConversation,
  isMessageSelectionMode,
} from '../../../state/selectors/conversations';

import {
  openConversationToSpecificMessage,
  openRightPanel,
  resetReturnConversation,
} from '../../../state/ducks/conversations';

import { useSelectedConversationKey } from '../../../state/selectors/selectedConversation';
import { Flex } from '../../basic/Flex';
import { AvatarHeader, BackButton, CallButton } from './ConversationHeaderItems';
import { SelectionOverlay } from './ConversationHeaderSelectionOverlay';
import { ConversationHeaderTitle } from './ConversationHeaderTitle';

export const ConversationHeaderWithDetails = () => {
  const isSelectionMode = useSelector(isMessageSelectionMode);
  const returnToConversation = useSelector(getReturnToConversation);
  const selectedConvoKey = useSelectedConversationKey();
  const dispatch = useDispatch();

  if (!selectedConvoKey) {
    return null;
  }

  const handleGoBack = async () => {
    if (!returnToConversation) {
      return;
    }
    await openConversationToSpecificMessage({
      conversationKey: returnToConversation.key,
      messageIdToNavigateTo: returnToConversation.messageId,
      shouldHighlightMessage: false,
    });
    void dispatch(resetReturnConversation());
  };

  return (
    <div className="module-conversation-header">
      <Flex
        container={true}
        justifyContent={'flex-end'}
        alignItems="center"
        width="100%"
        flexGrow={1}
      >
        <BackButton
          onGoBack={() => void handleGoBack()}
          showBackButton={returnToConversation !== undefined}
        />

        <ConversationHeaderTitle />

        {!isSelectionMode && (
          <Flex
            container={true}
            flexDirection="row"
            alignItems="center"
            flexGrow={0}
            flexShrink={0}
          >
            <CallButton />
            <AvatarHeader
              onAvatarClick={() => {
                dispatch(openRightPanel());
              }}
              pubkey={selectedConvoKey}
            />
          </Flex>
        )}
      </Flex>

      {isSelectionMode && <SelectionOverlay />}
    </div>
  );
};
