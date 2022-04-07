import { Page } from '@playwright/test';
import { sleepFor } from '../../../session/utils/Promise';

let focusInterval: NodeJS.Timeout | undefined;

export function startFocusInterval(getWindows: () => Array<Page>) {
  if (focusInterval) {
    throw new Error('You have to stop the previous focus interval first');
  }
  console.warn('startFocusInterval');

  focusInterval = global.setInterval(async () => {
    if (getWindows()?.length) {
      // tslint:disable-next-line: prefer-for-of
      for (let index = 0; index < getWindows().length; index++) {
        await getWindows()[index].bringToFront();
        await sleepFor(200);
      }
    }
  }, 1000);
}

export function stopFocusInterval() {
  if (!focusInterval) {
    console.warn('no focus interval');
    return;
  }

  global.clearInterval(focusInterval);
  focusInterval = undefined;
}
