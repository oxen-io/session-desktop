import { _electron, expect, Page, test } from '@playwright/test';
import { newUser } from './new_user';
import { openApp } from './open';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';
import { clickOnMatchingText, clickOnTestIdWithText } from './utils';
let window: Page | undefined;

test.beforeEach(cleanUpOtherTest);
test.afterEach(async () => {
  if (window) {
    await forceCloseAllWindows([window]);
  }
});

test('Change username', async () => {
  // Open App
  window = await openApp('1');
  // Create user
  await newUser(window, 'userA');
  // Open Profile
  await clickOnTestIdWithText(window, 'leftpane-primary-avatar');
  // Click on current username to open edit field
  await window.click('.session-icon-button.medium');
  // Type in new username
  await window.fill('.profile-name-input', 'new username');
  // Save
  await clickOnMatchingText(window, 'save');
  // Wait for Copy button to appear to verify username change
  await window.isVisible("'Copy'");
  // verify name change
  expect(await window.innerText('[data-testid=your-profile-name]')).toBe('new username');
  // Exit profile module
  await window.click('.session-icon-button.small');
});
