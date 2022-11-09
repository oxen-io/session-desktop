import { StateType } from '../reducer';
import { LeftOverlayMode, RightOverlayMode, SectionStateType, SectionType } from '../ducks/section';
import { SessionSettingCategory } from '../../components/settings/SessionSettings';

const getSection = (state: StateType): SectionStateType => state.section;

export const getFocusedSection = (state: StateType): SectionType =>
  getSection(state).focusedSection;

export const getFocusedSettingsSection = (state: StateType): SessionSettingCategory | undefined =>
  getSection(state).focusedSettingsSection;

export const getIsAppFocused = (state: StateType): boolean => getSection(state).isAppFocused;

export const getLeftOverlayMode = (state: StateType): LeftOverlayMode | undefined =>
  getSection(state).leftOverlayMode;

export const getRightOverlayMode = (state: StateType): RightOverlayMode | undefined =>
  getSection(state).rightOverlayMode;

export const isRightOverlayShown = (state: StateType): boolean =>
  getSection(state).rightOverlayMode !== undefined;
