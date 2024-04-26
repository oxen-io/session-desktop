import { useSelector } from 'react-redux';
import type { RightOverlayMode } from '../state/ducks/section';
import type { StateType } from '../state/reducer';
import { isRightPanelShowing } from '../state/selectors/conversations';

export function useIsRightPanelShowing(): boolean {
  return useSelector(isRightPanelShowing);
}

export function useRightOverlayMode(): RightOverlayMode | undefined {
  return useSelector((state: StateType): RightOverlayMode | undefined => {
    return state.section.rightOverlayMode;
  });
}
