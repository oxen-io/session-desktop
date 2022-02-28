import { _electron, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';
import { newUser } from './new_user';
import { openApp } from './open';
import { clickOnMatchingText, clickOnTestIdWithText, waitForMatchingText } from './utils';
let window: Page | undefined;

test.beforeEach(cleanUpOtherTest);
test.afterEach(async () => {
  if (window) {
    await forceCloseAllWindows([window]);
  }
});

const testPassword = '123456';
const newTestPassword = '789101112';

test.describe('Password checks', () => {
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
    await clickOnMatchingText(window, 'OK');
    // Change password
    await clickOnMatchingText(window, 'Change Password');
    // Enter old password
    await window.fill('#password-modal-input', testPassword);
    // Enter new password
    await window.fill('#password-modal-input-confirm', newTestPassword);
    await window.keyboard.press('Tab');
    // Confirm new password
    await window.fill('#password-modal-input-reconfirm', newTestPassword);
    // Press enter on keyboard
    await window.keyboard.press('Enter');
    // Select OK
    await clickOnMatchingText(window, 'OK');
    // Check toast notification for 'changed password'
  });
  test('Wrong password', async () => {
    // Check if incorrect password works
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
    await clickOnMatchingText(window, 'OK');
    // Navigate away from settings tab
    await clickOnTestIdWithText(window, 'message-section');
    // // Click on settings tab
    await clickOnTestIdWithText(window, 'settings-section');
    // // Try with incorrect password
    await window.fill('#password-lock-input', '0000');
    // Confirm
    await clickOnMatchingText(window, 'OK');
    // // invalid password banner showing?
    await waitForMatchingText(window, 'Invalid password');
    // // Empty password
    // // Navigate away from settings tab
    await clickOnTestIdWithText(window, 'message-section');
    // // Click on settings tab
    await clickOnTestIdWithText(window, 'settings-section');
    // // No password entered
    await clickOnMatchingText(window, 'OK');
    // // Banner should ask for password to be entered
    await waitForMatchingText(window, 'Please enter your password');
  });
});
