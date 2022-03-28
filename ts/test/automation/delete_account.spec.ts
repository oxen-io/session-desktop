import { _electron, expect, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './setup/beforeEach';
import { openAppsAndNewUsers, openAppsNoNewUsers } from './setup/new_user';
import { sendNewMessage } from './send_message';
import { clickOnMatchingText, clickOnTestIdWithText, waitForMatchingText } from './utils';
import { sleepFor } from '../../session/utils/Promise';

test.beforeEach(cleanUpOtherTest);

let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

test('Delete account from swarm', async () => {
  const testMessage = `A -> B: ${Date.now()}`;
  const testReply = `B -> A: ${Date.now()}`;
  const windowLoggedIn = await openAppsAndNewUsers(2);
  windows = windowLoggedIn.windows;
  const [windowA, windowB] = windows;
  const [userA, userB] = windowLoggedIn.users;
  // Create contact and send new message
  await Promise.all([
    sendNewMessage(windowA, userB.sessionid, testMessage),
    sendNewMessage(windowB, userA.sessionid, testReply),
  ]);

  // Delete all data from device
  // Click on settings tab
  await clickOnTestIdWithText(windowA, 'settings-section');
  // Click on clear all data
  await clickOnMatchingText(windowA, 'Clear All Data');
  // Select entire account
  await clickOnMatchingText(windowA, 'Entire Account');
  // Confirm deletion by clicking i am sure
  await clickOnMatchingText(windowA, 'I am sure');
  await windowA.waitForTimeout(7500);
  const [windowA2] = await openAppsNoNewUsers(1);
  // Wait for window to close and reopen

  await sleepFor(10000, true);

  const restoringWindows = await openAppsNoNewUsers(1);
  const [restoringWindow] = restoringWindows;
  // Sign in with deleted account and check that nothing restores
<<<<<<< HEAD
  await clickOnTestIdWithText(windowA2, 'restore-using-recovery');
  // Fill in recovery phrase
  await windowA2.fill('#session-input-floating-label', userA.recoveryPhrase);
  // Enter display name
  await windowA2.fill('[data-testid=display-name-input]', userA.userName);
  // Click continue
  await clickOnTestIdWithText(windowA2, 'continue-your-session-button');
  // Check if message from user B is restored
  await waitForMatchingText(windowA2, testMessage);
  // Check if contact user B is restored
  // Click on contacts tab
  await clickOnTestIdWithText(windowA2, 'contact-section');
=======
  await clickOnTestIdWithText(restoringWindow, 'restore-using-recovery', 'Restore your account');
  // Fill in recovery phrase
  await restoringWindow.fill('[data-testid=continue-session-button]', userA.recoveryPhrase);
  // Enter display name
  await restoringWindow.fill('[data-testid=display-name-input]', userA.userName);
  // Click continue
  await clickOnTestIdWithText(restoringWindow, 'continue-your-session-button');
  // Check if message from user B is restored
  await waitForMatchingText(restoringWindow, testMessage);
  // Check if contact user B is restored
  // Click on contacts tab
  await clickOnTestIdWithText(restoringWindow, 'contact-section');
>>>>>>> 4519a3f0314d6126d4ffd000f5f50b31db04dc20
  // Expect contacts list to be empty
  expect('[data-testid=module-conversation__user__profile-name]').toHaveLength(0);

  await forceCloseAllWindows(restoringWindows);
});
