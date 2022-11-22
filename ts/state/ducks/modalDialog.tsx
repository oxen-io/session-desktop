import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SessionConfirmDialogProps } from '../../components/dialog/SessionConfirm';
import { PasswordAction } from '../../components/dialog/SessionPasswordDialog';
export type BanType = 'ban' | 'unban';

export type ConfirmModalState = SessionConfirmDialogProps | null;

type BasicModalState = { conversationId: string } | null;

export type InvitePublicModalState = BasicModalState;
export type BanOrUnbanUserModalState =
  | (BasicModalState & {
      conversationId: string;
      banType: BanType;
      pubkey?: string;
    })
  | null;

export type RemoveMembersWithMessagesModalState = {
  conversationId: string;
  membersToRemove: Array<string>;
} | null;

export type AddModeratorsModalState = BasicModalState;
export type RemoveModeratorsModalState = BasicModalState;
export type ReadOnlyGroupMembersModalState = BasicModalState;
export type PromoteAdminClosedGroupModalState = BasicModalState;
export type UpdatePublicGroupNameModalState = BasicModalState;
export type ChangeNickNameModalState = BasicModalState;
export type AdminLeaveClosedGroupModalState = BasicModalState;
export type EditProfileModalState = {} | null;
export type OnionPathModalState = EditProfileModalState;
export type RecoveryPhraseModalState = EditProfileModalState;
export type DeleteAccountModalState = EditProfileModalState;

export type SessionPasswordModalState = { passwordAction: PasswordAction; onOk: () => void } | null;

export type UserDetailsModalState = {
  conversationId: string;
  authorAvatarPath: string | null;
  userName: string;
} | null;

export type ReactModalsState = {
  reaction: string;
  messageId: string;
} | null;

export type ModalState = {
  confirmModal: ConfirmModalState;
  invitePublicModal: InvitePublicModalState;
  banOrUnbanUserModal: BanOrUnbanUserModalState;
  removeModeratorsModal: RemoveModeratorsModalState;
  removeMembersWithMessagesModal: RemoveMembersWithMessagesModalState;
  addModeratorsModal: AddModeratorsModalState;
  publicGroupNameModal: UpdatePublicGroupNameModalState;
  readOnlyGroupMembersModal: ReadOnlyGroupMembersModalState;
  promoteAdminClosedGroupModal: PromoteAdminClosedGroupModalState;
  userDetailsModal: UserDetailsModalState;
  nickNameModal: ChangeNickNameModalState;
  editProfileModal: EditProfileModalState;
  onionPathModal: OnionPathModalState;
  recoveryPhraseModal: RecoveryPhraseModalState;
  adminLeaveClosedGroup: AdminLeaveClosedGroupModalState;
  sessionPasswordModal: SessionPasswordModalState;
  deleteAccountModal: DeleteAccountModalState;
  reactListModalState: ReactModalsState;
  reactClearAllModalState: ReactModalsState;
};

export const initialModalState: ModalState = {
  confirmModal: null,
  invitePublicModal: null,
  addModeratorsModal: null,
  removeModeratorsModal: null,
  removeMembersWithMessagesModal: null,
  banOrUnbanUserModal: null,
  publicGroupNameModal: null,
  readOnlyGroupMembersModal: null,
  promoteAdminClosedGroupModal: null,
  userDetailsModal: null,
  nickNameModal: null,
  editProfileModal: null,
  onionPathModal: null,
  recoveryPhraseModal: null,
  adminLeaveClosedGroup: null,
  sessionPasswordModal: null,
  deleteAccountModal: null,
  reactListModalState: null,
  reactClearAllModalState: null,
};

const ModalSlice = createSlice({
  name: 'modals',
  initialState: initialModalState,
  reducers: {
    updateConfirmModal(state, action: PayloadAction<ConfirmModalState | null>): ModalState {
      return { ...state, confirmModal: action.payload };
    },
    updateInvitePublicModal(
      state,
      action: PayloadAction<InvitePublicModalState | null>
    ): ModalState {
      return { ...state, invitePublicModal: action.payload };
    },
    updateBanOrUnbanUserModal(
      state,
      action: PayloadAction<BanOrUnbanUserModalState | null>
    ): ModalState {
      return { ...state, banOrUnbanUserModal: action.payload };
    },
    updateAddModeratorsModal(
      state,
      action: PayloadAction<AddModeratorsModalState | null>
    ): ModalState {
      return { ...state, addModeratorsModal: action.payload };
    },
    updateRemoveModeratorsModal(
      state,
      action: PayloadAction<RemoveModeratorsModalState | null>
    ): ModalState {
      return { ...state, removeModeratorsModal: action.payload };
    },
    updateRemoveMembersWithMessagesModal(
      state,
      action: PayloadAction<RemoveMembersWithMessagesModalState | null>
    ): ModalState {
      return { ...state, removeMembersWithMessagesModal: action.payload };
    },
    updatePublicGroupNameModal(
      state,
      action: PayloadAction<UpdatePublicGroupNameModalState | null>
    ): ModalState {
      return { ...state, publicGroupNameModal: action.payload };
    },
    showReadOnlyGroupMembersModal(
      state,
      action: PayloadAction<ReadOnlyGroupMembersModalState | null>
    ): ModalState {
      return { ...state, readOnlyGroupMembersModal: action.payload };
    },
    promoteAdminToClosedGroup(
      state,
      action: PayloadAction<PromoteAdminClosedGroupModalState | null>
    ): ModalState {
      return { ...state, promoteAdminClosedGroupModal: action.payload };
    },
    updateUserDetailsModal(state, action: PayloadAction<UserDetailsModalState | null>): ModalState {
      return { ...state, userDetailsModal: action.payload };
    },
    changeNickNameModal(state, action: PayloadAction<ChangeNickNameModalState | null>): ModalState {
      return { ...state, nickNameModal: action.payload };
    },
    editProfileModal(state, action: PayloadAction<EditProfileModalState | null>): ModalState {
      return { ...state, editProfileModal: action.payload };
    },
    onionPathModal(state, action: PayloadAction<OnionPathModalState | null>): ModalState {
      return { ...state, onionPathModal: action.payload };
    },
    recoveryPhraseModal(state, action: PayloadAction<RecoveryPhraseModalState | null>): ModalState {
      return { ...state, recoveryPhraseModal: action.payload };
    },
    adminLeaveClosedGroup(
      state,
      action: PayloadAction<AdminLeaveClosedGroupModalState | null>
    ): ModalState {
      return { ...state, adminLeaveClosedGroup: action.payload };
    },
    sessionPassword(state, action: PayloadAction<SessionPasswordModalState>): ModalState {
      return { ...state, sessionPasswordModal: action.payload };
    },
    updateDeleteAccountModal(state, action: PayloadAction<DeleteAccountModalState>): ModalState {
      return { ...state, deleteAccountModal: action.payload };
    },
    updateReactListModal(state, action: PayloadAction<ReactModalsState>): ModalState {
      return { ...state, reactListModalState: action.payload };
    },
    updateReactClearAllModal(state, action: PayloadAction<ReactModalsState>): ModalState {
      return { ...state, reactClearAllModalState: action.payload };
    },
  },
});

export const { actions, reducer } = ModalSlice;
export const {
  updateConfirmModal,
  updateInvitePublicModal,
  updateAddModeratorsModal,
  updateRemoveModeratorsModal,
  updateRemoveMembersWithMessagesModal,
  updatePublicGroupNameModal,
  showReadOnlyGroupMembersModal,
  promoteAdminToClosedGroup,
  updateUserDetailsModal,
  changeNickNameModal,
  editProfileModal,
  onionPathModal,
  recoveryPhraseModal,
  adminLeaveClosedGroup,
  sessionPassword,
  updateDeleteAccountModal,
  updateBanOrUnbanUserModal,
  updateReactListModal,
  updateReactClearAllModal,
} = actions;
export const modalReducer = reducer;
