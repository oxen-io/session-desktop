import { _electron } from 'playwright-core';
import { openAppsNoNewUsers } from './new_user';
import { clickOnTestIdWithText } from '../utils';

const recoveryPhraseTest =
  'pinched total ongoing sushi etched rest gone long oilfield incur code grunt code';
const userNameTest = 'oldUser';
export async function linkedDevice() {
  const [windowA1, windowA2] = await openAppsNoNewUsers(2);

  await clickOnTestIdWithText(windowA1, 'restore-using-recovery');
  await windowA1.fill('[data-testid=recovery-phrase-input]', recoveryPhraseTest);
  await windowA1.fill('[data-testid=display-name-input]', userNameTest);
  await clickOnTestIdWithText(windowA1, 'continue-session-button');
  // Log into window with link device
  await clickOnTestIdWithText(windowA2, 'link-device');
  await windowA2.fill('[data-testid=recovery-phrase-input]', recoveryPhraseTest);
  await clickOnTestIdWithText(windowA2, 'continue-session-button');

  return [windowA1, windowA2];
}
