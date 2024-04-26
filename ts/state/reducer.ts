import { combineReducers } from '@reduxjs/toolkit';

import type { CallStateType } from './ducks/call'; // ok
import { callReducer as call } from './ducks/call'; // ok: importing only RingingManager.ts which is not importing anything else
import type { ConversationsStateType } from './ducks/conversations'; // ok
import { reducer as conversations } from './ducks/conversations'; // todo
import type { DefaultRoomsState } from './ducks/defaultRooms'; // ok: only importing d.ts
import { defaultRoomReducer as defaultRooms } from './ducks/defaultRooms'; // todo
import { reducer as primaryColor } from './ducks/primaryColor'; // ok: importing only Constants.tsx which is not importing anything else
import type { SearchStateType } from './ducks/search'; // ok
import { reducer as search } from './ducks/search'; // todo
import type { SectionStateType } from './ducks/section'; // ok
import { reducer as section } from './ducks/section'; // ok: importing only SessionSettingsCategory which is not importing anything else
import type { SogsRoomInfoState } from './ducks/sogsRoomInfo'; // ok
import { ReduxSogsRoomInfos } from './ducks/sogsRoomInfo'; // ok: importing nothing else
import { reducer as theme } from './ducks/theme'; // ok: importing only Constants.tsx which is not importing anything else
import type { UserStateType } from './ducks/user'; // ok
import { reducer as user } from './ducks/user'; // ok: not importing anything else

import type { PrimaryColorStateType, ThemeStateType } from '../themes/constants/colors'; // ok: not importing anything else
import type { ModalState } from './ducks/modalDialog';
import { modalReducer as modals } from './ducks/modalDialog'; // todo
import type { OnionState } from './ducks/onion';
import { defaultOnionReducer as onionPaths } from './ducks/onion'; // ok: not importing anything else
import type { SettingsState } from './ducks/settings';
import { settingsReducer } from './ducks/settings'; // ok: just importing settings-key.tsx which is not importing anything else
import type { StagedAttachmentsStateType } from './ducks/stagedAttachments';
import { reducer as stagedAttachments } from './ducks/stagedAttachments';
import type { UserConfigState } from './ducks/userConfig';
import { userConfigReducer as userConfig } from './ducks/userConfig'; // ok: not importing anything else

export type StateType = {
  search: SearchStateType;
  user: UserStateType;
  conversations: ConversationsStateType;
  theme: ThemeStateType;
  primaryColor: PrimaryColorStateType;
  section: SectionStateType;
  defaultRooms: DefaultRoomsState;
  onionPaths: OnionState;
  modals: ModalState;
  userConfig: UserConfigState;
  stagedAttachments: StagedAttachmentsStateType;
  call: CallStateType;
  sogsRoomInfo: SogsRoomInfoState;
  settings: SettingsState;
};

const reducers = {
  search,
  conversations,
  user,
  theme,
  primaryColor,
  section,
  defaultRooms,
  onionPaths,
  modals,
  userConfig,
  stagedAttachments,
  call,
  sogsRoomInfo: ReduxSogsRoomInfos.sogsRoomInfoReducer,
  settings: settingsReducer,
};

// Making this work would require that our reducer signature supported AnyAction, not
//   our restricted actions
export const rootReducer = combineReducers(reducers);
