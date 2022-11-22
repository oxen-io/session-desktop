import React from 'react';
import { useSelector } from 'react-redux';

import { AdminLeaveClosedGroupDialog } from './AdminLeaveClosedGroupDialog';
import { InvitePublicDialog } from './InvitePublicDialog';
import { DeleteAccountModal } from './DeleteAccountModal';
import { EditProfileDialog } from './EditProfileDialog';
import { OnionPathModal } from './OnionStatusPathDialog';
import { UserDetailsDialog } from './UserDetailsDialog';
import { SessionConfirm } from './SessionConfirm';
import { SessionPasswordDialog } from './SessionPasswordDialog';
import { SessionSeedModal } from './SessionSeedModal';
import { AddModeratorsDialog } from './ModeratorsAddDialog';
import { RemoveModeratorsDialog } from './ModeratorsRemoveDialog';
import { SessionNicknameDialog } from './SessionNicknameDialog';
import { BanOrUnBanUserDialog } from './BanOrUnbanUserDialog';
import { ReactListModal } from './ReactListModal';
import { ReactClearAllModal } from './ReactClearAllModal';
import { UpdatePublicGroupNameDialog } from './UpdatePublicGroupNameDialog';
import { ReadOnlyGroupMembersDialog } from './ReadOnlyGroupMembersDialog';
import { PromoteAdminClosedGroupDialog } from './PromoteAdminClosedGroupDialog';
import { StateType } from '../../state/reducer';
import { RemoveMembersWithMessagesDialog } from './RemoveMembersWithMessagesDialog';

export const ModalContainer = () => {
  const confirmModalState = useSelector((state: StateType) => state.modals.confirmModal);
  const inviteModalState = useSelector((state: StateType) => state.modals.invitePublicModal);
  const addModeratorsModalState = useSelector(
    (state: StateType) => state.modals.addModeratorsModal
  );
  const removeModeratorsModalState = useSelector(
    (state: StateType) => state.modals.removeModeratorsModal
  );
  const removeMembersWithMessagesModalState = useSelector(
    (state: StateType) => state.modals.removeMembersWithMessagesModal
  );
  const readOnlyGroupMembersState = useSelector(
    (state: StateType) => state.modals.readOnlyGroupMembersModal
  );
  const promoteAdminClosedGroupState = useSelector(
    (state: StateType) => state.modals.promoteAdminClosedGroupModal
  );
  const updatePublicGroupNameModalState = useSelector(
    (state: StateType) => state.modals.publicGroupNameModal
  );
  const userDetailsModalState = useSelector((state: StateType) => state.modals.userDetailsModal);
  const changeNicknameModal = useSelector((state: StateType) => state.modals.nickNameModal);
  const editProfileModalState = useSelector((state: StateType) => state.modals.editProfileModal);
  const onionPathModalState = useSelector((state: StateType) => state.modals.onionPathModal);
  const recoveryPhraseModalState = useSelector(
    (state: StateType) => state.modals.recoveryPhraseModal
  );
  const adminLeaveClosedGroupModalState = useSelector(
    (state: StateType) => state.modals.adminLeaveClosedGroup
  );
  const sessionPasswordModalState = useSelector(
    (state: StateType) => state.modals.sessionPasswordModal
  );
  const deleteAccountModalState = useSelector(
    (state: StateType) => state.modals.deleteAccountModal
  );
  const banOrUnbanUserModalState = useSelector(
    (state: StateType) => state.modals.banOrUnbanUserModal
  );
  const reactListModalState = useSelector((state: StateType) => state.modals.reactListModalState);
  const reactClearAllModalState = useSelector(
    (state: StateType) => state.modals.reactClearAllModalState
  );

  return (
    <>
      {banOrUnbanUserModalState && <BanOrUnBanUserDialog {...banOrUnbanUserModalState} />}
      {inviteModalState && <InvitePublicDialog {...inviteModalState} />}
      {addModeratorsModalState && <AddModeratorsDialog {...addModeratorsModalState} />}
      {removeModeratorsModalState && <RemoveModeratorsDialog {...removeModeratorsModalState} />}
      {removeMembersWithMessagesModalState && (
        <RemoveMembersWithMessagesDialog {...removeMembersWithMessagesModalState} />
      )}
      {readOnlyGroupMembersState && <ReadOnlyGroupMembersDialog {...readOnlyGroupMembersState} />}
      {promoteAdminClosedGroupState && (
        <PromoteAdminClosedGroupDialog {...promoteAdminClosedGroupState} />
      )}
      {updatePublicGroupNameModalState && (
        <UpdatePublicGroupNameDialog {...updatePublicGroupNameModalState} />
      )}
      {userDetailsModalState && <UserDetailsDialog {...userDetailsModalState} />}
      {changeNicknameModal && <SessionNicknameDialog {...changeNicknameModal} />}
      {editProfileModalState && <EditProfileDialog {...editProfileModalState} />}
      {onionPathModalState && <OnionPathModal {...onionPathModalState} />}
      {recoveryPhraseModalState && <SessionSeedModal {...recoveryPhraseModalState} />}
      {adminLeaveClosedGroupModalState && (
        <AdminLeaveClosedGroupDialog {...adminLeaveClosedGroupModalState} />
      )}
      {sessionPasswordModalState && <SessionPasswordDialog {...sessionPasswordModalState} />}
      {deleteAccountModalState && <DeleteAccountModal {...deleteAccountModalState} />}
      {confirmModalState && <SessionConfirm {...confirmModalState} />}
      {reactListModalState && <ReactListModal {...reactListModalState} />}
      {reactClearAllModalState && <ReactClearAllModal {...reactClearAllModalState} />}
    </>
  );
};
