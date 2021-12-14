import React from 'react';
// tslint:disable-next-line: no-submodule-imports
import useMount from 'react-use/lib/useMount';

export function useFocusMount(ref: React.RefObject<any>) {
  useMount(() => {
    ref?.current?.focus();
  });
}
