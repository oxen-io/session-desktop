import React, { SessionDataTestId } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import {
  useIsIncomingRequest,
  useNicknameOrProfileNameOrShortenedPubkey,
} from '../../hooks/useParamSelector';
import { PubKey } from '../../session/types';
import {
  hasSelectedConversationOutgoingMessages,
  useSelectedHasMessages,
} from '../../state/selectors/conversations';
import {
  getSelectedCanWrite,
  useSelectedConversationIdOrigin,
  useSelectedConversationKey,
  useSelectedHasDisabledBlindedMsgRequests,
  useSelectedIsApproved,
  useSelectedIsGroupV2,
  useSelectedIsNoteToSelf,
  useSelectedIsPrivate,
  useSelectedNicknameOrProfileNameOrShortenedPubkey,
} from '../../state/selectors/selectedConversation';
import {
  useLibGroupInviteGroupName,
  useLibGroupInvitePending,
  useLibGroupKicked,
} from '../../state/selectors/userGroups';
import { LocalizerKeys } from '../../types/LocalizerKeys';
import { SessionHtmlRenderer } from '../basic/SessionHTMLRenderer';

const Container = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  background-color: var(--background-secondary-color);
`;

const TextInner = styled.div`
  color: var(--text-secondary-color);
  text-align: center;
  max-width: 390px;
`;

function TextNotification({ html, dataTestId }: { html: string; dataTestId: SessionDataTestId }) {
  return (
    <Container data-testid={dataTestId}>
      <TextInner>
        <SessionHtmlRenderer html={html} />
      </TextInner>
    </Container>
  );
}

export const MessageRequestExplanation = () => {
  const isGroupV2 = useSelectedIsGroupV2();

  return isGroupV2 ? <GroupRequestExplanation /> : <ConversationRequestExplanation />;
};

const ConversationRequestExplanation = () => {
  const selectedConversation = useSelectedConversationKey();
  const isIncomingMessageRequest = useIsIncomingRequest(selectedConversation);

  const showMsgRequestUI = selectedConversation && isIncomingMessageRequest;
  const hasOutgoingMessages = useSelector(hasSelectedConversationOutgoingMessages);

  if (!showMsgRequestUI || hasOutgoingMessages) {
    return null;
  }

  return (
    <TextNotification
      dataTestId="conversation-request-explanation"
      html={window.i18n('respondingToRequestWarning')}
    />
  );
};

const GroupRequestExplanation = () => {
  const selectedConversation = useSelectedConversationKey();
  const isIncomingMessageRequest = useIsIncomingRequest(selectedConversation);
  const isGroupV2 = useSelectedIsGroupV2();
  const showMsgRequestUI = selectedConversation && isIncomingMessageRequest;
  // isApproved in DB is tracking the pending state for a group
  const isApproved = useSelectedIsApproved();
  const isGroupPendingInvite = useLibGroupInvitePending(selectedConversation);

  if (!showMsgRequestUI || isApproved || !isGroupV2 || !isGroupPendingInvite) {
    return null;
  }
  return (
    <TextNotification
      dataTestId="group-request-explanation"
      html={window.i18n('respondingToGroupRequestWarning')}
    />
  );
};

export const InvitedToGroupControlMessage = () => {
  const selectedConversation = useSelectedConversationKey();
  const isGroupV2 = useSelectedIsGroupV2();
  const hasMessages = useSelectedHasMessages();
  const isApproved = useSelectedIsApproved();

  const groupName = useLibGroupInviteGroupName(selectedConversation) || window.i18n('unknown');
  const conversationOrigin = useSelectedConversationIdOrigin();
  const adminNameInvitedUs =
    useNicknameOrProfileNameOrShortenedPubkey(conversationOrigin) || window.i18n('unknown');
  const isGroupPendingInvite = useLibGroupInvitePending(selectedConversation);
  if (
    !selectedConversation ||
    isApproved ||
    hasMessages || // we don't want to display that "xx invited you" message if there are already other messages (incoming or outgoing)
    !isGroupV2 ||
    (conversationOrigin && !PubKey.is05Pubkey(conversationOrigin)) ||
    !isGroupPendingInvite
  ) {
    return null;
  }
  // when restoring from seed we might not have the pubkey of who invited us, in that case, we just use a fallback
  const html = conversationOrigin
    ? window.i18n('userInvitedYouToGroup', [adminNameInvitedUs, groupName])
    : window.i18n('youWereInvitedToGroup', [groupName]);

  return <TextNotification dataTestId="group-invite-control-message" html={html} />;
};

export const NoMessageInConversation = () => {
  const selectedConversation = useSelectedConversationKey();

  const hasMessage = useSelectedHasMessages();
  const isGroupV2 = useSelectedIsGroupV2();
  const isInvitePending = useLibGroupInvitePending(selectedConversation);

  const isMe = useSelectedIsNoteToSelf();
  const canWrite = useSelector(getSelectedCanWrite);
  const privateBlindedAndBlockingMsgReqs = useSelectedHasDisabledBlindedMsgRequests();
  // TODOLATER use this selector accross the whole application (left pane excluded)
  const nameToRender = useSelectedNicknameOrProfileNameOrShortenedPubkey() || '';
  const isPrivate = useSelectedIsPrivate();
  const isIncomingRequest = useIsIncomingRequest(selectedConversation);
  const isKickedFromGroup = useLibGroupKicked(selectedConversation);

  // groupV2 use its own invite logic as part of <GroupRequestExplanation />
  if (
    !selectedConversation ||
    hasMessage ||
    (isGroupV2 && isInvitePending) ||
    (isPrivate && isIncomingRequest)
  ) {
    return null;
  }
  let localizedKey: LocalizerKeys = 'noMessagesInEverythingElse';
  if (!canWrite) {
    if (privateBlindedAndBlockingMsgReqs) {
      localizedKey = 'noMessagesInBlindedDisabledMsgRequests';
    } else {
      localizedKey = 'thereAreNoMessagesIn';
    }
  } else if (isMe) {
    localizedKey = 'noMessagesInNoteToSelf';
  }
  let dataTestId: SessionDataTestId = 'empty-conversation-notification';
  if (isGroupV2 && isKickedFromGroup) {
    localizedKey = 'youWereRemovedFrom';
    dataTestId = 'group-control-message';
  }

  return (
    <TextNotification dataTestId={dataTestId} html={window.i18n(localizedKey, [nameToRender])} />
  );
};
