import { _electron, expect, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './setup/beforeEach';
import { recoverFromSeed } from './setup/recovery_using_seed';
import {
  clickOnMatchingText,
  clickOnTestIdWithText,
  typeIntoInput,
  waitForReadableMessageWithText,
  waitForTestIdWithText,
} from './utils';
// import { createGroup } from './setup/create_group';
import { testContact, testUser } from './setup/test_user';
import { openAppsNoNewUsers } from './setup/new_user';

test.beforeEach(cleanUpOtherTest);

const windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

test('Group testing', async () => {
  // Open Electron
  // const { windowA } = await createGroup();
  const [windowA, windowB] = await openAppsNoNewUsers(2);
  await recoverFromSeed(windowA, testUser.sessionid, testUser.recoveryPhrase);
  // Change the name of the group and check that it syncs to all devices (config messages)
  // Click on already created group
  await clickOnMatchingText(windowA, 'testGroup');
  // Click on group avatar to open settings
  await clickOnTestIdWithText(windowA, 'conversation-options-avatar');
  // Click on edit group name
  await clickOnMatchingText(windowA, 'Edit group name');
  // Fill in new group name in input box
  await typeIntoInput(windowA, 'group-name-input', 'newGroupName');
  await windowA.keyboard.press('Enter');
  // Click OK
  await waitForTestIdWithText(windowA, 'right-panel-group-name', 'newGroupName');
  await waitForTestIdWithText(windowA, 'readable-message', "Group name is now 'newGroupName'.");
  // Check config message in window B for group name change
  await waitForTestIdWithText(windowB, 'readable-message', "Group name is now 'newGroupName'.");

  // Check to see that you can't change group name to empty string
  // Click on edit group name
  await clickOnMatchingText(windowA, 'Edit group name');
  await windowA.fill('.profile-name-input', '   ');
  await windowA.keyboard.press('Enter');
  const errorMessage = windowA.locator('.error-message');
  await expect(errorMessage).toContainText('Please enter a group name');
  await clickOnMatchingText(windowA, 'Cancel');

  // Check to see if you can leave group and all members get config message
  // Log in with non-admin group member
  await recoverFromSeed(windowB, testContact.sessionid, testContact.recoveryPhrase);
  // Click on group in conversation list
  await clickOnMatchingText(windowB, 'newGroupName');
  // Navigate to the three dots menu
  await clickOnTestIdWithText(windowB, 'three-dots-conversation-options');
  // Select leave group
  await clickOnMatchingText(windowB, 'Leave Group');
  // Confirm leave group
  await clickOnTestIdWithText(windowB, 'session-confirm-ok-button', 'OK');
  // Check for config message that you left group
  await waitForTestIdWithText(windowB, 'readable-message', 'You have left the group.');
  // Check in window A for config message the whale left group
  await waitForReadableMessageWithText(windowA, 'Whale has left the group');
  // Re-add Whale back into group
  await clickOnTestIdWithText;
});
