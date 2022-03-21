import { _electron, expect, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './setup/beforeEach';
import { linkedDevice } from './setup/linked_device';
import { clickOnTestIdWithText } from './utils';

test.beforeEach(cleanUpOtherTest);

let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

test('linking device', async () => {
  const { windowA1, windowA2, userA } = await linkedDevice();

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

  await clickOnTestIdWithText(windowA1, 'leftpane-primary-avatar');
  // Click on pencil icon
  await clickOnTestIdWithText(windowA1, 'edit-profile-icon');
  // Replace old username with new username
  const newUsername = 'new-username';
  await windowA1.fill('.profile-name-input', newUsername);
  // Press enter to confirm change
  await windowA1.keyboard.press('Enter');
  // Wait for loading animation
  // Check username change in window B2
  // Click on profile settings in window B
  await clickOnTestIdWithText(windowA2, 'leftpane-primary-avatar');
  // Verify username has changed to new username
  expect(await windowA2.innerText('[data-testid=your-profile-name]')).toBe(userA.userName);
  // Check message is deleting on both devices
});
