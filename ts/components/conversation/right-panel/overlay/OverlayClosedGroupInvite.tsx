import _ from 'lodash';
import { difference } from 'lodash';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { useSet } from '../../../../hooks/useSet';
import { VALIDATION } from '../../../../session/constants';
import { getConversationController } from '../../../../session/conversations';
import { initiateClosedGroupUpdate } from '../../../../session/group/closed-group';
import { ToastUtils, UserUtils } from '../../../../session/utils';
import { setRightOverlayMode } from '../../../../state/ducks/section';
import { usePrivateContactsPubkeys } from '../../../../state/selectors/conversations';

import { useRightOverlayMode } from '../../../../state/selectors/section';
import {
  useSelectedConversationKey,
  useSelectedIsClosedGroup,
  useSelectedIsClosedGroupV3,
  useSelectedMembers,
  useSelectedWeAreAdmin,
  useSelectedZombies,
} from '../../../../state/selectors/selectedConversation';

import { Flex } from '../../../basic/Flex';
import { SessionButton } from '../../../basic/SessionButton';
import { SpacerLG } from '../../../basic/Text';
import { MemberListItem } from '../../../MemberListItem';

import { StyledScrollContainer } from '../RightPanel';
import { RightOverlayHeader } from './RightOverlayHeader';

const PotentialMembersList = styled.div`
  width: 100%;
`;

const inviteToClosedGroup = async (convoId: string, pubkeys: Array<string>) => {
  debugger; // we need to make sure this is still OK for v2 grouips and add the logic for v3 groups
  const convo = getConversationController().get(convoId);
  if (!convo || !convo.isClosedGroup()) {
    throw new Error('submitForClosedGroup group not found');
  }
  // closed group chats
  const ourPK = UserUtils.getOurPubKeyStrFromCache();
  // we only care about real members. If a member is currently a zombie we have to be able to add him back
  let existingMembers = convo.get('members') || [];
  // at least make sure it's an array
  if (!Array.isArray(existingMembers)) {
    existingMembers = [];
  }
  existingMembers = _.compact(existingMembers);
  const existingZombies = convo.get('zombies') || [];
  const newMembers = pubkeys.filter(d => !existingMembers.includes(d));

  if (newMembers.length > 0) {
    // Do not trigger an update if there is too many members
    // be sure to include current zombies in this count
    if (
      newMembers.length + existingMembers.length + existingZombies.length >
      VALIDATION.CLOSED_GROUP_SIZE_LIMIT
    ) {
      ToastUtils.pushTooManyMembers();
      return;
    }

    const allMembers = _.concat(existingMembers, newMembers, [ourPK]);
    const uniqMembers = _.uniq(allMembers);

    const groupId = convo.get('id');
    const groupName = convo.getNicknameOrRealUsernameOrPlaceholder();

    await initiateClosedGroupUpdate(groupId, groupName, uniqMembers);
  }
};

export const OverlayClosedGroupInvite = () => {
  const rightOverlay = useRightOverlayMode();
  const conversationId = useSelectedConversationKey();
  const privateContactPubkeys = usePrivateContactsPubkeys();
  const isClosedGroup = useSelectedIsClosedGroup();
  const weAreAdmin = useSelectedWeAreAdmin();
  const isV3 = useSelectedIsClosedGroupV3();
  const alreadyMembers = useSelectedMembers();
  const zombies = useSelectedZombies();
  const dispatch = useDispatch();

  const potentialMembers = difference(privateContactPubkeys, alreadyMembers, zombies);

  const { uniqueValues: selectedContacts, addTo, removeFrom } = useSet<string>();
  const hasSelectedContacts = Boolean(selectedContacts.length);

  useEffect(() => {
    if (!conversationId || !isClosedGroup || (!weAreAdmin && !isV3)) {
      dispatch(setRightOverlayMode({ type: 'default', params: null }));
    }
  }, [conversationId, weAreAdmin, isV3, isClosedGroup]);

  if (!rightOverlay || rightOverlay.type !== 'closed_group_invite' || !conversationId) {
    return null;
  }

  const hasContacts = potentialMembers.length > 0;

  return (
    <StyledScrollContainer>
      <Flex container={true} flexDirection={'column'} alignItems={'center'} width="100%">
        <RightOverlayHeader title={window.i18n('inviteContacts')} hideBackButton={false} />
        <PotentialMembersList>
          {hasContacts ? (
            potentialMembers.map((member: string) => (
              <MemberListItem
                key={member}
                pubkey={member}
                isSelected={selectedContacts.includes(member)}
                onSelect={addTo}
                onUnselect={removeFrom}
                disableBg={true}
              />
            ))
          ) : (
            <>
              <SpacerLG />
              <p className="no-contacts">{window.i18n('noContactsToAdd')}</p>
              <SpacerLG />
            </>
          )}
        </PotentialMembersList>
        <SpacerLG />
        {hasSelectedContacts && (
          <SessionButton
            text={window.i18n('invite')}
            onClick={() => {
              void inviteToClosedGroup(conversationId, selectedContacts);
            }}
          />
        )}
      </Flex>
    </StyledScrollContainer>
  );
};
