import { _electron, expect, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './setup/beforeEach';
import { linkedDevice } from './setup/linked_device';
import { clickOnTestIdWithText } from './utils';

test.beforeEach(cleanUpOtherTest);

const windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

const newUsername = 'new-username';
const sessionIDTest = '05560802be231abc2fbaa860f09da4c2f20dafa4e5f560f77d61c5f587ef2c741f';
const contactOne = 'Fish';
const contactTwo = 'Dragon';
const contactThree = 'Whale';
const contactFour = 'Gopher';

test('Linked Device', async () => {
  // Open two windows
  await linkedDevice(windows);
  const [windowA1, windowA2] = windows;
  // Click on profile tab
  await clickOnTestIdWithText(windowA2, 'leftpane-primary-avatar');
  // Check session ID
  expect(await windowA2.innerText('[data-testid=your-session-id]')).toBe(sessionIDTest);
  // Exit profile module
  await windowA2.click('.session-icon-button.small');
  // Check that "you're almost finished" banner isn't displayed
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
  // Verify Contacts and Groups are loaded correctly
  // Click on contacts tab
  await clickOnTestIdWithText(windowA2, 'contact-section');
  expect(await windowA2.innerText('[data-testid=module-conversation__user__profile-name]')).toBe(
    contactOne
  );
  expect(
    await windowA2.innerText(':nth-match([data-testid=module-conversation__user__profile-name], 2)')
  ).toBe(contactTwo);
  expect(
    await windowA2.innerText(':nth-match([data-testid=module-conversation__user__profile-name], 3)')
  ).toBe(contactThree);
  expect(
    await windowA2.innerText(':nth-match([data-testid=module-conversation__user__profile-name], 4)')
  ).toBe(contactFour);
  // Change user name
  // Click on profile tab
  await clickOnTestIdWithText(windowA1, 'leftpane-primary-avatar');
  // Click on edit icon
  await clickOnTestIdWithText(windowA1, 'edit-profile-icon');
  // Fill in new username
  await windowA1.fill('.profile-name-input', newUsername);
  // Press enter
  await windowA1.keyboard.press('Enter');
  // Verify changing name works
  // CLick on profile tab in window 2
  await windowA2.waitForTimeout(2000);
  await clickOnTestIdWithText(windowA2, 'leftpane-primary-avatar');
  expect(await windowA2.innerText('[data-testid=your-profile-name]')).toBe(newUsername);
  // Verify sending message and unsending works as expected
});
