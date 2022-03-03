import { _electron, expect, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';
import { openAppsAndNewUsers } from './new_user';
import { openApp } from './open';
import { clickOnMatchingText, clickOnTestIdWithText } from './utils';

test.beforeEach(cleanUpOtherTest);

let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

test('Linked Device', async () => {
  // Open two windows, with two different users
  const windowLoggedIn = await openAppsAndNewUsers(2);
  windows = windowLoggedIn.windows;
  const users = windowLoggedIn.users;
  const [windowA, windowB] = windows;
  const [userA] = users;
  // Log windowA out
  // Select settings section
  await clickOnTestIdWithText(windowA, 'settings-section');
  // Select 'clear all data'
  await clickOnMatchingText(windowA, 'Clear All Data');
  // Select device only
  await clickOnMatchingText(windowA, 'Device Only');
  // Select 'i am sure'
  await clickOnMatchingText(windowA, 'I am sure');
  // wait for window to close and reopen
  await windowA.waitForTimeout(5000);
  // Get the first window that the app opens, wait if necessary.
  const windowA2 = await openApp('A');
  // select link device
  await clickOnMatchingText(windowA2, 'Link Device');
  // Input recovery phrase for User A
  await windowA2.fill('#session-input-floating-label', userA.recoveryPhrase);
  // Click 'Continue Your Session'
  await clickOnMatchingText(windowA2, 'Continue Your Session');
  // Check name and avatar have been restored correctly
  await clickOnTestIdWithText(windowA2, 'leftpane-primary-avatar');
  // Verify Username
  expect(await windowA2.innerText('[data-testid=your-profile-name]')).toBe(userA.userName);
  // Verify Session ID
  expect(await windowA2.innerText('[data-testid=your-session-id]')).toBe(userA.sessionid);
  // exit profile module
  await windowA2.click('.session-icon-button.small');
  //  Contacts and groups restore correctly

  // You're almost finished isn't displayed
  const errorDesc = 'Should not be found';
  try {
    const elemShouldNotBeFound = windowA2.locator('[data-testid=reveal-recovery-phrase]');
    if (elemShouldNotBeFound) {
      console.warn('Element not found');
      throw new Error(errorDesc);
    }
  } catch (e) {
    if (e.message !== errorDesc) {
      // this is NOT ok
      throw e;
    }
  }
  // Log out of windowB to sign in with linked account
  // Select settings section
  await clickOnTestIdWithText(windowB, 'settings-section');
  // Select 'clear all data'
  await clickOnMatchingText(windowB, 'Clear All Data');
  // Select device only
  await clickOnMatchingText(windowB, 'Device Only');
  // Select 'i am sure'
  await clickOnMatchingText(windowB, 'I am sure');
  // Open a second window with matching accounts to verify sync
  const windowB2 = await openApp('B');
  // Log in to window B2 with linked account
  await clickOnMatchingText(windowB2, 'Link Device');
  // Input recovery phrase for User A
  await windowB2.fill('#session-input-floating-label', userA.recoveryPhrase);
  // Click 'Continue Your Session'
  await clickOnMatchingText(windowB2, 'Continue Your Session');
  // Changing display name in window A2 and check it is synced in window B2
  await clickOnTestIdWithText(windowA2, 'leftpane-primary-avatar');
  // Click on pencil icon
  await clickOnTestIdWithText(windowA2, 'edit-profile-icon');
  // Replace old username with new username
  const newUsername = 'new-username';
  await windowA2.fill('.profile-name-input', newUsername);
  // Press enter to confirm change
  await windowA2.keyboard.press('Enter');
  // Wait for loading animation
  // Check username change in window B2
  // Click on profile settings in window B
  await clickOnTestIdWithText(windowB2, 'leftpane-primary-avatar');
  // Verify username has changed to new username
  expect(await windowB2.innerText('[data-testid=your-profile-name]')).toBe(newUsername);
  // Check message is deleting on both devices
});
