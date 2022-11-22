import React from 'react';

import _ from 'lodash';
import { SpacerLG } from '../basic/Text';
import { MemberListItem } from '../MemberListItem';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { useDispatch } from 'react-redux';
import {
  useGroupAdmins,
  useGroupMembers,
  useIsOpenOrClosedGroup,
  useIsPublic,
  useWeAreAdmin,
} from '../../hooks/useParamSelector';
import styled from 'styled-components';
import { showReadOnlyGroupMembersModal } from '../../state/ducks/modalDialog';
import { openConversationWithMessages } from '../../state/ducks/conversations';
import { resetRightOverlayMode } from '../../state/ducks/section';
import { useEscapeAction } from '../../hooks/useEscapeAction';

type Props = {
  conversationId: string;
};

const StyledMemberList = styled.div`
  max-height: 240px;
`;

/**
 * Admins are always put first in the list of group members.
 * Also, admins have a little crown on their avatar.
 */
const ReadOnlyMemberList = (props: { convoId: string; members: Array<string> }) => {
  const { convoId, members } = props;
  const groupAdmins = useGroupAdmins(convoId);
  const dispatch = useDispatch();
  if (!convoId) {
    throw new Error('MemberList needs convoProps');
  }
  const currentMembers = [...members].sort(m => (groupAdmins?.includes(m) ? -1 : 0));

  return (
    <>
      {currentMembers.map(member => {
        const isAdmin = groupAdmins?.includes(member);

        return (
          <MemberListItem
            pubkey={member}
            key={member}
            isAdmin={isAdmin}
            disableBg={true}
            isSelected={false}
            inMentions={true}
            onSelect={() => {
              dispatch(showReadOnlyGroupMembersModal(null));
              dispatch(resetRightOverlayMode());
              openConversationWithMessages({ conversationKey: member, messageId: null });
            }}
          />
        );
      })}
    </>
  );
};

export const ReadOnlyGroupMembersDialog = (props: Props) => {
  const { conversationId } = props;
  const dispatch = useDispatch();
  const isPublic = useIsPublic(conversationId);
  const isGroup = useIsOpenOrClosedGroup(conversationId);
  const members = useGroupMembers(conversationId);
  const weAreAdmin = useWeAreAdmin(conversationId);

  if (weAreAdmin || !isGroup || isPublic) {
    throw new Error('ReadOnlyGroupMembersDialog invalid convoProps');
  }

  const closeDialog = () => {
    dispatch(showReadOnlyGroupMembersModal(null));
  };

  useEscapeAction(closeDialog);

  const showNoMembersMessage = members.length === 0;
  const titleText = window.i18n('groupMembers');

  return (
    <SessionWrapperModal title={titleText} onClose={closeDialog} showClose={true}>
      {showNoMembersMessage ? (
        <p>{window.i18n('noMembersInThisGroup')}</p>
      ) : (
        <StyledMemberList className="group-member-list__selection">
          <ReadOnlyMemberList convoId={conversationId} members={members} />
        </StyledMemberList>
      )}

      <SpacerLG />
    </SessionWrapperModal>
  );
};
