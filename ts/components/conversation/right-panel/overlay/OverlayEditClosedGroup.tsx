import _, { concat, difference, includes, uniq, xor } from 'lodash';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import styled from 'styled-components';
import { useEscapeAction } from '../../../../hooks/useEscapeAction';
import {
  useWeAreAdmin,
  useConversationPropsById,
  useConversationUsername,
} from '../../../../hooks/useParamSelector';
import { useSet } from '../../../../hooks/useSet';
import { getConversationController } from '../../../../session/conversations';
import { initiateClosedGroupUpdate } from '../../../../session/group/closed-group';
import { UserUtils, ToastUtils } from '../../../../session/utils';
import { resetRightOverlayMode, setRightOverlayMode } from '../../../../state/ducks/section';

import { useRightOverlayMode } from '../../../../state/selectors/section';
import {
  useSelectedAdmins,
  useSelectedConversationKey,
  useSelectedDescription,
  useSelectedIsClosedGroup,
  useSelectedMembers,
  useSelectedWeAreAdmin,
} from '../../../../state/selectors/selectedConversation';
import { Avatar, AvatarSize } from '../../../avatar/Avatar';

import { Flex } from '../../../basic/Flex';
import { SessionButton, SessionButtonColor } from '../../../basic/SessionButton';
import { SpacerLG } from '../../../basic/Text';
import { PanelButtonGroup, PanelIconButton } from '../../../buttons';
import { StyledPanelGroupTitle } from '../../../buttons/PanelButton';
import { SessionIconButton } from '../../../icon';
import { MemberListItem } from '../../../MemberListItem';
import { StyledScrollContainer } from '../RightPanel';
import { RightOverlayHeader } from './RightOverlayHeader';

const StyledClassicMemberList = styled.div`
  max-height: 240px;
  width: 100%;
`;

/**
 * Admins are always put first in the list of group members.
 * Also, admins have a little crown on their avatar.
 */
const ClassicMemberList = (props: {
  convoId: string;
  selectedMembers: Array<string>;
  onSelect: (m: string) => void;
  onUnselect: (m: string) => void;
}) => {
  const { onSelect, convoId, onUnselect, selectedMembers } = props;
  const weAreAdmin = useWeAreAdmin(convoId);
  const convoProps = useConversationPropsById(convoId);
  if (!convoProps) {
    throw new Error('MemberList needs convoProps');
  }
  let currentMembers = convoProps.members || [];
  const { groupAdmins } = convoProps;
  currentMembers = [...currentMembers].sort(m => (groupAdmins?.includes(m) ? -1 : 0));

  return (
    <>
      {currentMembers.map(member => {
        const isSelected = (weAreAdmin && selectedMembers.includes(member)) || false;
        const isAdmin = groupAdmins?.includes(member);

        return (
          <MemberListItem
            pubkey={member}
            isSelected={isSelected}
            onSelect={onSelect}
            onUnselect={onUnselect}
            key={member}
            isAdmin={isAdmin}
            disableBg={true}
          />
        );
      })}
    </>
  );
};

async function onEditClosedGroup(convoId: string, membersSelectedToRemove: Array<string>) {
  // not ideal to get the props here, but this is not run often
  const convoProps = getConversationController()
    .get(convoId)
    .getConversationModelProps();
  if (!convoProps || !convoProps.isGroup || convoProps.isPublic) {
    throw new Error('Invalid convo for OverlayEditClosedGroup');
  }
  if (!convoProps.weAreAdmin) {
    window.log.warn('Skipping update of members, we are not the admin');
    return;
  }
  const existingMembers = convoProps.members || [];

  const ourPK = UserUtils.getOurPubKeyStrFromCache();
  const membersAfterUpdate = difference(existingMembers, membersSelectedToRemove);

  const allMembersAfterUpdate = uniq(concat(membersAfterUpdate, [ourPK]));

  // membersAfterUpdate won't include the zombies. We are the admin and we want to remove them not matter what

  // We need to NOT trigger an group update if the list of member is the same.
  // We need to merge all members, including zombies for this call.
  // We consider that the admin ALWAYS wants to remove zombies (actually they should be removed
  // automatically by him when the LEFT message is received)

  const existingZombies = convoProps.zombies || [];

  const allExistingMembersWithZombies = _.uniq(existingMembers.concat(existingZombies));

  const notPresentInOld = allMembersAfterUpdate.filter(
    m => !allExistingMembersWithZombies.includes(m)
  );

  debugger; // we need to make sure this is still OK for v2 grouips and add the logic for v3 groups

  // be sure to include zombies in here
  const membersToRemove = allExistingMembersWithZombies.filter(
    m => !allMembersAfterUpdate.includes(m)
  );

  // do the xor between the two. if the length is 0, it means the before and the after is the same.
  const xorResult = xor(membersToRemove, notPresentInOld);
  if (xorResult.length === 0) {
    window.log.info('skipping group update: no detected changes in group member list');

    return;
  }

  // If any extra devices of removed exist in newMembers, ensure that you filter them
  // Note: I think this is useless
  const filteredMembers = allMembersAfterUpdate.filter(
    memberAfterUpdate => !includes(membersToRemove, memberAfterUpdate)
  );

  void initiateClosedGroupUpdate(
    convoId,
    convoProps.displayNameInProfile || 'Unknown',
    filteredMembers
  );
}

const GroupInfosContainer = styled.div`
  max-width: 300px;
`;
const GroupNameContainer = styled.div`
  display: flex;
  align-items: baseline;

  gap: 5px;
  color: var(--text-primary-color);
  justify-content: center;
  margin-bottom: var(--margins-md);
  font-size: 26px;
`;

const GroupName = styled.div``;

const GroupDescription = styled.div`
  color: var(--text-secondary-color);
`;

const GroupNameAndDescription = ({ conversationId }: { conversationId: string }) => {
  const groupName = useConversationUsername(conversationId);
  const groupDescription = useSelectedDescription();
  const hasDescription = !!groupDescription;
  const dispatch = useDispatch();

  const clickEdit = () => {
    dispatch(setRightOverlayMode({ type: 'closed_group_edit_name', params: null }));
  };

  return (
    <GroupInfosContainer>
      <SpacerLG />
      <GroupNameContainer>
        <SessionIconButton
          iconType="pencil"
          iconSize="small"
          onClick={clickEdit}
          dataTestId="edit-group-name-or-description"
        />
        <GroupName>{groupName}</GroupName>
      </GroupNameContainer>
      {hasDescription && <GroupDescription>{groupDescription}</GroupDescription>}
    </GroupInfosContainer>
  );
};

export const OverlayEditClosedGroup = () => {
  const rightOverlay = useRightOverlayMode();
  const conversationId = useSelectedConversationKey();

  const isClosedGroup = useSelectedIsClosedGroup();
  const existingMembers = useSelectedMembers();
  const ourPubkey = UserUtils.getOurPubKeyStrFromCache();
  const admins = useSelectedAdmins();
  const weAreAdmin = useSelectedWeAreAdmin();

  const { addTo, removeFrom, uniqueValues: membersToRemove } = useSet<string>([]);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!isClosedGroup || !weAreAdmin) {
      dispatch(setRightOverlayMode({ type: 'default', params: null }));
    }
  }, [isClosedGroup, weAreAdmin]);

  const hideOverlay = () => {
    dispatch(resetRightOverlayMode());
  };

  const onClickRemove = async () => {
    // const members = getWouldBeMembers(this.state.contactList).map(d => d.id);
    // do not include zombies here, they are removed by force
    if (!conversationId) {
      throw new Error('we need a conversationId');
    }
    await onEditClosedGroup(conversationId, membersToRemove);
    hideOverlay();
  };

  useEscapeAction(hideOverlay);

  const onAdd = (member: string) => {
    if (!weAreAdmin) {
      ToastUtils.pushOnlyAdminCanRemove();
      return;
    }

    if (member === ourPubkey) {
      return;
    }

    addTo(member);
  };

  const onRemove = (member: string) => {
    if (!weAreAdmin) {
      window?.log?.warn('Only group admin can remove members!');

      ToastUtils.pushOnlyAdminCanRemove();
      return;
    }
    if (admins.includes(member)) {
      ToastUtils.pushCannotRemoveCreatorFromGroup();
      window?.log?.warn(
        `User ${member} cannot be removed as they are the creator of the closed group.`
      );
      return;
    }

    removeFrom(member);
  };

  const inviteContacts = () => {
    dispatch(setRightOverlayMode({ type: 'closed_group_invite', params: null }));
  };

  const showNoMembersMessage = existingMembers.length === 0;

  if (!rightOverlay || rightOverlay.type !== 'closed_group_edit' || !conversationId) {
    return null;
  }
  return (
    <StyledScrollContainer>
      <Flex container={true} flexDirection={'column'} alignItems={'center'} width="100%">
        <RightOverlayHeader title={window.i18n('updateGroupDialogTitle')} hideBackButton={false} />
        <Avatar
          pubkey={conversationId}
          dataTestId="avatar-edit-group-dialog"
          size={AvatarSize.XL}
        />
        <GroupNameAndDescription conversationId={conversationId} />
        <SpacerLG />
        <PanelButtonGroup>
          <PanelIconButton
            iconType="addUser"
            text={window.i18n('inviteContacts')}
            disableBg={true}
            onClick={inviteContacts}
          />
        </PanelButtonGroup>
        <SpacerLG />

        {showNoMembersMessage ? (
          <p>{window.i18n('noMembersInThisGroup')}</p>
        ) : (
          <>
            <StyledPanelGroupTitle>{window.i18n('groupMembers')}</StyledPanelGroupTitle>
            <StyledClassicMemberList className="group-member-list__selection">
              <ClassicMemberList
                convoId={conversationId}
                onSelect={onAdd}
                onUnselect={onRemove}
                selectedMembers={membersToRemove}
              />
            </StyledClassicMemberList>
            {!!membersToRemove?.length && (
              <SessionButton
                buttonColor={SessionButtonColor.Danger}
                text={window.i18n('remove')}
                onClick={onClickRemove}
              />
            )}
          </>
        )}
        <SpacerLG />
      </Flex>
    </StyledScrollContainer>
  );
};
