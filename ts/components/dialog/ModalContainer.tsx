import React from 'react';
import { useSelector } from 'react-redux';
import {
  getAddModeratorsModal,
  getAdminLeaveClosedGroupDialog,
  getBanOrUnbanUserModalState,
  getChangeNickNameDialog,
  getConfirmModal,
  getDeleteAccountModalState,
  getEditProfileDialog,
  getInvitePublicModalState,
  getOnionPathDialog,
  getReactClearAllDialog,
  getReactListDialog,
  getReadOnlyGroupMembersModal,
  getRecoveryPhraseDialog,
  getRemoveModeratorsModal,
  getSessionPasswordDialog,
  getUpdatePublicGroupNameModal,
  getUserDetailsModal,
} from '../../state/selectors/modal';
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

export const ModalContainer = () => {
  const confirmModalState = useSelector(getConfirmModal);
  const inviteModalState = useSelector(getInvitePublicModalState);
  const addModeratorsModalState = useSelector(getAddModeratorsModal);
  const removeModeratorsModalState = useSelector(getRemoveModeratorsModal);
  const readOnlyGroupMembersState = useSelector(getReadOnlyGroupMembersModal);
  const promoteAdminClosedGroupState = useSelector(
    (state: StateType) => state.modals.promoteAdminClosedGroupModal
  );
  const updatePublicGroupNameModalState = useSelector(getUpdatePublicGroupNameModal);
  const userDetailsModalState = useSelector(getUserDetailsModal);
  const changeNicknameModal = useSelector(getChangeNickNameDialog);
  const editProfileModalState = useSelector(getEditProfileDialog);
  const onionPathModalState = useSelector(getOnionPathDialog);
  const recoveryPhraseModalState = useSelector(getRecoveryPhraseDialog);
  const adminLeaveClosedGroupModalState = useSelector(getAdminLeaveClosedGroupDialog);
  const sessionPasswordModalState = useSelector(getSessionPasswordDialog);
  const deleteAccountModalState = useSelector(getDeleteAccountModalState);
  const banOrUnbanUserModalState = useSelector(getBanOrUnbanUserModalState);
  const reactListModalState = useSelector(getReactListDialog);
  const reactClearAllModalState = useSelector(getReactClearAllDialog);

  return (
    <>
      {banOrUnbanUserModalState && <BanOrUnBanUserDialog {...banOrUnbanUserModalState} />}
      {inviteModalState && <InvitePublicDialog {...inviteModalState} />}
      {addModeratorsModalState && <AddModeratorsDialog {...addModeratorsModalState} />}
      {removeModeratorsModalState && <RemoveModeratorsDialog {...removeModeratorsModalState} />}
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
