import { _electron, expect, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './setup/beforeEach';
import { openAppsAndNewUsers, openAppsNoNewUsers } from './setup/new_user';
import { sendNewMessage } from './send_message';
import { clickOnMatchingText, clickOnTestIdWithText, waitForMatchingText } from './utils';

const testMessage = 'Sending Test Message';
const testReply = 'Sending Reply Test Message';

test.beforeEach(cleanUpOtherTest);

let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

test('Delete account from swarm', async () => {
  const windowLoggedIn = await openAppsAndNewUsers(2);
  windows = windowLoggedIn.windows;
  const users = windowLoggedIn.users;
  const [windowA, windowB] = windows;
  const [userA, userB] = users;
  // Create contact and send new message
  await sendNewMessage(windowA, userB.sessionid, testMessage);
  await sendNewMessage(windowB, userA.sessionid, testReply);
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
  // Sign in with deleted account and check that nothing restores
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
  // Expect contacts list to be empty
  expect('[data-testid=module-conversation__user__profile-name]').toHaveLength(0);
});
