/* eslint-disable no-await-in-loop */
import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { GroupPubkeyType, UserGroupsGet } from 'libsession_util_nodejs';

export type UserGroupState = {
  userGroups: Record<GroupPubkeyType, UserGroupsGet>;
};

export const initialUserGroupState: UserGroupState = {
  userGroups: {},
};

const userGroupSlice = createSlice({
  name: 'userGroup',
  initialState: initialUserGroupState,

  reducers: {
    refreshUserGroupsSlice(
      state: UserGroupState,
      action: PayloadAction<{ groups: Array<UserGroupsGet> }>
    ) {
      state.userGroups = {};
      action.payload.groups.forEach(m => {
        state.userGroups[m.pubkeyHex] = m;
      });

      return state;
    },
  },
});

export const userGroupsActions = {
  ...userGroupSlice.actions,
};
export const userGroupReducer = userGroupSlice.reducer;
