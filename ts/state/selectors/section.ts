import { StateType } from '../reducer';
import { LeftOverlayMode, RightOverlayMode, SectionStateType, SectionType } from '../ducks/section';
import { SessionSettingCategory } from '../../components/settings/SessionSettings';
import { useSelector } from 'react-redux';

const getSection = (state: StateType): SectionStateType => state.section;

const getFocusedSection = (state: StateType): SectionType => getSection(state).focusedSection;

export const useFocusedSection = () => {
  return useSelector(getFocusedSection);
};

export const getFocusedSettingsSection = (state: StateType): SessionSettingCategory | undefined =>
  getSection(state).focusedSettingsSection;

export const useFocusedSettingsSection = () => {
  return useSelector(getFocusedSettingsSection);
};

const getIsAppFocused = (state: StateType): boolean => getSection(state).isAppFocused;

export const useGetAppIsFocused = () => {
  return useSelector(getIsAppFocused);
};

const getLeftOverlayMode = (state: StateType): LeftOverlayMode | undefined =>
  getSection(state).leftOverlayMode;

export const useLeftOverlayMode = () => {
  return useSelector(getLeftOverlayMode);
};

const getRightOverlayMode = (state: StateType): RightOverlayMode | undefined =>
  getSection(state).rightOverlayMode;

export const useRightOverlayMode = () => {
  return useSelector(getRightOverlayMode);
};

export const isRightOverlayShown = (state: StateType): boolean =>
  getSection(state).rightOverlayMode !== undefined;
