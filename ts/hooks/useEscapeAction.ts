// tslint:disable-next-line: no-submodule-imports

import useKey from 'react-use/lib/useKey';

export function useEscapeAction(action: () => void) {
  useKey((event: KeyboardEvent) => {
    return event.key === 'Esc' || event.key === 'Escape';
  }, action);
}
