import { _electron, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';
import { newUser } from './new_user';
import { openApp } from './open';
import { clickOnMatchingText, clickOnTestIdWithText } from './utils';
let window: Page | undefined;

test.beforeEach(cleanUpOtherTest);
test.afterEach(async () => {
  if (window) {
    await forceCloseAllWindows([window]);
  }
});

const testPassword = '123456';
const newTestPassword = '789101112';

test('Set Password', async () => {
  // open Electron
  window = await openApp('1');
  // Create user
  await newUser(window, 'userA');
  // Click on settings tab
  await clickOnTestIdWithText(window, 'settings-section');
  // Click on privacy
  await clickOnMatchingText(window, 'Privacy');
  // Click set password
  await clickOnMatchingText(window, 'Set Password');
  // Enter password
  await window.type('#password-modal-input', testPassword);
  // Confirm password
  await window.type('#password-modal-input-confirm', testPassword);
  // Click OK
  await window.keyboard.press('Enter');
  // Type password into input field
  await window.fill('#password-lock-input', testPassword);
  // Click OK
  await clickOnMatchingText(window, 'Ok');
  // Change password
  await clickOnMatchingText(window, 'Change password');
  // Enter old password
  await window.fill('#password-modal-input', testPassword);
  // Enter new password
  await window.fill('#password-modal-input-confirm', newTestPassword);
  // Confirm new password
  await window.fill('#password-modal-input-reconfirm', newTestPassword);
  // Select OK
  await clickOnMatchingText(window, 'Ok');
  // Check toast notification for 'changed password'
});
