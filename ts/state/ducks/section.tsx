import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SessionSettingCategory } from '../../components/settings/SessionSettings';

export enum SectionType {
  Profile,
  Message,
  Settings,
  ColorMode,
  PathIndicator,
}

export type LeftOverlayMode =
  | 'choose-action'
  | 'message'
  | 'open-group'
  | 'closed-group'
  | 'message-requests';

type RightPanelDefaultState = { type: 'default'; params: null };
type RightPanelMessageDetailsState = {
  type: 'message_info';
  params: { messageId: string; defaultAttachment: number | undefined };
};
type RightPanelAllMediaState = { type: 'show_media'; params: null };
type RightPanelDisappearingState = { type: 'disappearing_messages'; params: null };
type RightPanelNotificationsState = { type: 'notifications'; params: null };

export type RightOverlayMode =
  | RightPanelDefaultState
  | RightPanelMessageDetailsState
  | RightPanelAllMediaState
  | RightPanelDisappearingState
  | RightPanelNotificationsState;

export type SectionStateType = {
  focusedSection: SectionType;
  focusedSettingsSection?: SessionSettingCategory;
  isAppFocused: boolean;
  leftOverlayMode: LeftOverlayMode | undefined;
  rightOverlayMode: RightOverlayMode | undefined;
};

export const initialSectionState: SectionStateType = {
  focusedSection: SectionType.Message,
  focusedSettingsSection: undefined,
  isAppFocused: false,
  leftOverlayMode: undefined,
  rightOverlayMode: { type: 'default', params: null },
};

/**
 * This slice is the one holding the default joinable rooms fetched once in a while from the default opengroup v2 server.
 */
const sectionSlice = createSlice({
  name: 'sectionRooms',
  initialState: initialSectionState,
  reducers: {
    showLeftPaneSection(state: SectionStateType, action: PayloadAction<SectionType>) {
      // if we change to something else than settings, reset the focused settings section
      const focusedSection = action.payload;

      if (focusedSection !== SectionType.Settings) {
        return {
          ...state,
          focusedSection,
          focusedSettingsSection: undefined,
        };
      }

      // on click on the gear icon: show the appearance tab by default
      return {
        ...state,
        focusedSection,
        focusedSettingsSection: SessionSettingCategory.Privacy,
      };
    },

    showSettingsSection(state: SectionStateType, action: PayloadAction<SessionSettingCategory>) {
      return {
        ...state,
        focusedSettingsSection: action.payload,
      };
    },
    setRightOverlayMode(state: SectionStateType, action: PayloadAction<RightOverlayMode>) {
      state.rightOverlayMode = action.payload;
      return state;
    },
    resetRightOverlayMode(state: SectionStateType) {
      state.rightOverlayMode = undefined;
      return state;
    },
    setLeftOverlayMode(state: SectionStateType, action: PayloadAction<LeftOverlayMode>) {
      state.leftOverlayMode = action.payload;
      return state;
    },
    resetLeftOverlayMode(state: SectionStateType) {
      state.leftOverlayMode = undefined;
      return state;
    },
    setIsAppFocused(state: SectionStateType, action: PayloadAction<boolean>) {
      state.isAppFocused = action.payload;
      return state;
    },
  },
});

export const { actions, reducer } = sectionSlice;
export const {
  showLeftPaneSection,
  showSettingsSection,
  setLeftOverlayMode,
  resetLeftOverlayMode,
  setRightOverlayMode,
  resetRightOverlayMode,
  setIsAppFocused,
} = actions;
export const sectionReducer = reducer;
