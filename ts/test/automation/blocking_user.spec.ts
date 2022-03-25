import { _electron, expect, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './setup/beforeEach';
import { openAppsAndNewUsers } from './setup/new_user';
import { sendNewMessage } from './send_message';
import { clickOnMatchingText, clickOnTestIdWithText, waitForTestIdWithText } from './utils';

test.beforeEach(cleanUpOtherTest);

let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

test('Block User', async () => {
  // Open app and create user
  const windowLoggedIn = await openAppsAndNewUsers(2);
  windows = windowLoggedIn.windows;
  const users = windowLoggedIn.users;
  const [windowA, windowB] = windows;
  const [userA, userB] = users;
  // Create contact and send new message
  await sendNewMessage(windowA, userB.sessionid, `A -> B: ${Date.now()}`);
  await sendNewMessage(windowB, userA.sessionid, `B -> A: ${Date.now()}`);
  //Click on three dots menu
  await clickOnTestIdWithText(windowA, 'three-dots-conversation-options');
  // Select block
  await clickOnMatchingText(windowA, 'Block');
  // Verify toast notification 'blocked'
  await waitForTestIdWithText(windowA, 'session-toast', 'Blocked');
  // Verify the border of conversation list item is red
  const blockedBorder = windowA.locator('.module-conversation-list-item--is-blocked');
  await expect(blockedBorder).toHaveCSS('border-left', '4px solid rgb(255, 69, 58)');
  // Unblock user
  //Click on three dots menu
  await clickOnTestIdWithText(windowA, 'three-dots-conversation-options');
  // Select block
  await clickOnMatchingText(windowA, 'Unblock');
  // Verify toast notification says unblocked
  await waitForTestIdWithText(windowA, 'session-toast', 'Unblocked');
  // Verify border has gone back to default
  const unblockedBorder = windowA.locator('.module-conversation-list-item--is-selected');
  await expect(unblockedBorder).toHaveCSS('border-left', '4px solid rgb(0, 233, 123)');
});
