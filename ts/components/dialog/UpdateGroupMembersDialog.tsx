import _, { difference } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import useKey from 'react-use/lib/useKey';
import styled from 'styled-components';

import { PubkeyType } from 'libsession_util_nodejs';
import { ToastUtils, UserUtils } from '../../session/utils';

import { updateGroupMembersModal } from '../../state/ducks/modalDialog';
import { MemberListItem } from '../MemberListItem';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { SpacerLG, Text } from '../basic/Text';

import {
  useConversationUsername,
  useGroupAdmins,
  useIsPrivate,
  useIsPublic,
  useSortedGroupMembers,
  useWeAreAdmin,
  useZombies,
} from '../../hooks/useParamSelector';

import { useSet } from '../../hooks/useSet';
import { ConvoHub } from '../../session/conversations';
import { ClosedGroup } from '../../session/group/closed-group';
import { PubKey } from '../../session/types';
import { hasClosedGroupV2QAButtons } from '../../shared/env_vars';
import { groupInfoActions } from '../../state/ducks/metaGroups';
import { useMemberGroupChangePending } from '../../state/selectors/groups';
import { useSelectedIsGroupV2 } from '../../state/selectors/selectedConversation';
import { SessionSpinner } from '../basic/SessionSpinner';
import { SessionToggle } from '../basic/SessionToggle';

type Props = {
  conversationId: string;
};

const StyledClassicMemberList = styled.div`
  max-height: 240px;
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
  const isV2Group = useSelectedIsGroupV2();

  const groupAdmins = useGroupAdmins(convoId);
  const groupMembers = useSortedGroupMembers(convoId);

  const sortedMembers = useMemo(
    () => [...groupMembers].sort(m => (groupAdmins?.includes(m) ? -1 : 0)),
    [groupMembers, groupAdmins]
  );

  return (
    <>
      {sortedMembers.map(member => {
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
            displayGroupStatus={isV2Group && weAreAdmin}
            groupPk={convoId}
          />
        );
      })}
    </>
  );
};

const ZombiesList = ({ convoId }: { convoId: string }) => {
  const weAreAdmin = useWeAreAdmin(convoId);
  const zombies = useZombies(convoId);

  function onZombieClicked() {
    if (!weAreAdmin) {
      ToastUtils.pushOnlyAdminCanRemove();
    }
  }
  if (!zombies?.length) {
    return null;
  }

  const zombieElements = zombies.map((zombie: string) => {
    const isSelected = weAreAdmin || false; // && !member.checkmarked;
    return (
      <MemberListItem
        isSelected={isSelected}
        onSelect={onZombieClicked}
        onUnselect={onZombieClicked}
        isZombie={true}
        key={zombie}
        pubkey={zombie}
      />
    );
  });
  return (
    <>
      <SpacerLG />
      {weAreAdmin && (
        <Text
          padding="20px"
          text={window.i18n('removeResidueMembers')}
          subtle={true}
          maxWidth="400px"
          textAlign="center"
        />
      )}
      {zombieElements}
    </>
  );
};

async function onSubmit(convoId: string, membersAfterUpdate: Array<string>) {
  const convoFound = ConvoHub.use().get(convoId);
  if (!convoFound || !convoFound.isGroup()) {
    throw new Error('Invalid convo for updateGroupMembersDialog');
  }
  if (!convoFound.weAreAdminUnblinded()) {
    window.log.warn('Skipping update of members, we are not the admin');
    return;
  }
  const ourPK = UserUtils.getOurPubKeyStrFromCache();

  const allMembersAfterUpdate = _.uniq(_.concat(membersAfterUpdate, [ourPK]));

  // membersAfterUpdate won't include the zombies. We are the admin and we want to remove them not matter what

  // We need to NOT trigger an group update if the list of member is the same.
  // We need to merge all members, including zombies for this call.
  // We consider that the admin ALWAYS wants to remove zombies (actually they should be removed
  // automatically by him when the LEFT message is received)

  const existingMembers = convoFound.getGroupMembers() || [];
  const existingZombies = convoFound.getGroupZombies() || [];

  const allExistingMembersWithZombies = _.uniq(existingMembers.concat(existingZombies));

  const notPresentInOld = allMembersAfterUpdate.filter(
    m => !allExistingMembersWithZombies.includes(m)
  );

  // be sure to include zombies in here
  const membersToRemove = allExistingMembersWithZombies.filter(
    m => !allMembersAfterUpdate.includes(m)
  );

  // do the xor between the two. if the length is 0, it means the before and the after is the same.
  const xor = _.xor(membersToRemove, notPresentInOld);
  if (xor.length === 0) {
    window.log.info('skipping group update: no detected changes in group member list');

    return;
  }

  // If any extra devices of removed exist in newMembers, ensure that you filter them
  // Note: I think this is useless
  const filteredMembers = allMembersAfterUpdate.filter(
    memberAfterUpdate => !_.includes(membersToRemove, memberAfterUpdate)
  );

  void ClosedGroup.initiateClosedGroupUpdate(
    convoId,
    convoFound.getRealSessionUsername() || 'Unknown',
    filteredMembers
  );
}

export const UpdateGroupMembersDialog = (props: Props) => {
  const { conversationId } = props;
  const isPrivate = useIsPrivate(conversationId);
  const isPublic = useIsPublic(conversationId);
  const weAreAdmin = useWeAreAdmin(conversationId);
  const existingMembers = useSortedGroupMembers(conversationId) || [];
  const displayName = useConversationUsername(conversationId);
  const groupAdmins = useGroupAdmins(conversationId);
  const isProcessingUIChange = useMemberGroupChangePending();
  const [alsoRemoveMessages, setAlsoRemoveMessages] = useState(false);

  const {
    addTo,
    removeFrom,
    uniqueValues: membersToKeepWithUpdate,
  } = useSet<string>(existingMembers);

  const dispatch = useDispatch();

  if (isPrivate || isPublic) {
    throw new Error('UpdateGroupMembersDialog invalid convoProps');
  }

  const closeDialog = () => {
    dispatch(updateGroupMembersModal(null));
  };

  const onClickOK = async () => {
    if (PubKey.is03Pubkey(conversationId)) {
      const groupv2Action = groupInfoActions.currentDeviceGroupMembersChange({
        groupPk: conversationId,
        addMembersWithHistory: [],
        addMembersWithoutHistory: [],
        removeMembers: difference(existingMembers, membersToKeepWithUpdate) as Array<PubkeyType>,
        alsoRemoveMessages,
      });
      dispatch(groupv2Action as any);

      return; // keeping the dialog open until the async thunk is done
    }

    await onSubmit(conversationId, membersToKeepWithUpdate);

    closeDialog();
  };

  useKey((event: KeyboardEvent) => {
    return event.key === 'Esc' || event.key === 'Escape';
  }, closeDialog);

  const onAdd = (member: string) => {
    if (!weAreAdmin) {
      ToastUtils.pushOnlyAdminCanRemove();
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
    if (groupAdmins?.includes(member)) {
      if (PubKey.is03Pubkey(conversationId)) {
        ToastUtils.pushCannotRemoveAdminFromGroup();
        window?.log?.warn(`User ${member} cannot be removed as they are adn admin.`);
        return;
      }
      ToastUtils.pushCannotRemoveCreatorFromGroup();
      window?.log?.warn(
        `User ${member} cannot be removed as they are the creator of the closed group.`
      );
      return;
    }

    removeFrom(member);
  };

  const showNoMembersMessage = existingMembers.length === 0;
  const okText = window.i18n('ok');
  const cancelText = window.i18n('cancel');
  const titleText = window.i18n('updateGroupDialogTitle', [displayName || '']);

  return (
    <SessionWrapperModal title={titleText} onClose={closeDialog}>
      {hasClosedGroupV2QAButtons() ? (
        <>
          Also remove messages:
          <SessionToggle
            active={alsoRemoveMessages}
            onClick={() => {
              setAlsoRemoveMessages(!alsoRemoveMessages);
            }}
          />
        </>
      ) : null}
      <StyledClassicMemberList className="group-member-list__selection">
        <ClassicMemberList
          convoId={conversationId}
          onSelect={onAdd}
          onUnselect={onRemove}
          selectedMembers={membersToKeepWithUpdate}
        />
      </StyledClassicMemberList>
      <ZombiesList convoId={conversationId} />
      {showNoMembersMessage && <p>{window.i18n('noMembersInThisGroup')}</p>}

      <SpacerLG />
      <SessionSpinner loading={isProcessingUIChange} />
      <SpacerLG />

      <div className="session-modal__button-group">
        {weAreAdmin && (
          <SessionButton
            text={okText}
            onClick={onClickOK}
            buttonType={SessionButtonType.Simple}
            disabled={isProcessingUIChange}
            dataTestId="session-confirm-ok-button"
          />
        )}
        <SessionButton
          text={cancelText}
          buttonColor={weAreAdmin ? SessionButtonColor.Danger : undefined}
          buttonType={SessionButtonType.Simple}
          onClick={closeDialog}
          disabled={isProcessingUIChange}
          dataTestId="session-confirm-cancel-button"
        />
      </div>
    </SessionWrapperModal>
  );
};
