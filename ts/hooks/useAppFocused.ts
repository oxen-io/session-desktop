import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useGetAppIsFocused } from '../state/selectors/section';
import { ipcRenderer } from 'electron';
import { setIsAppFocused } from '../state/ducks/section';

/**
 * This custom hook should be called on the top of the app only once.
 * It sets up a listener for events from main_node.ts and update the global redux state with the focused state.
 */
export function useAppIsFocused() {
  const dispatch = useDispatch();
  const isFocusedFromStore = useGetAppIsFocused();

  const ipcCallback = (_event: unknown, isFocused: unknown) => {
    if (isFocusedFromStore !== isFocused) {
      dispatch(setIsAppFocused(Boolean(isFocused)));
    }
  };

  useEffect(() => {
    ipcRenderer.on('set-window-focus', ipcCallback);
    return () => {
      ipcRenderer.removeListener('set-window-focus', ipcCallback);
    };
  });

  return isFocusedFromStore;
}
