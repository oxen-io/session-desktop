import { _electron, expect, Page, test } from '@playwright/test';
import { newUser } from './new_user';
import { openApp } from './open';
import { sleepFor } from '../../session/utils/Promise';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';
import { clickOnMatchingText, clickOnTestIdWithText } from './utils';

let window: Page | undefined;
test.beforeEach(cleanUpOtherTest);
test.afterEach(async () => {
  if (window) {
    await forceCloseAllWindows([window]);
  }
});
test('Create User', async () => {
  // Launch Electron app.
  window = await openApp('1');
  // Create User
  const userA = await newUser(window, 'userA');
  // Open profile tab
  await clickOnTestIdWithText(window, 'leftpane-primary-avatar');
  await sleepFor(100);
  //check username matches
  expect(await window.innerText('[data-testid=your-profile-name]')).toBe(userA.userName);
  //check session id matches
  expect(await window.innerText('[data-testid=your-session-id]')).toBe(userA.sessionid);
  // exit profile module
  await window.click('.session-icon-button.small');
  // go to settings section
  await clickOnTestIdWithText(window, 'settings-section');
  // check recovery phrase matches
  await clickOnMatchingText(window, 'Recovery Phrase');
  expect(await window.innerText('[data-testid=recovery-phrase-seed-modal]')).toBe(
    userA.recoveryPhrase
  );
  // Exit profile module
  await window.click('.session-icon-button.small');
});
