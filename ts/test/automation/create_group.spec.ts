import { _electron, expect, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './setup/beforeEach';
import { clickOnMatchingText } from './utils';
import { createGroup } from './setup/create_group';

test.beforeEach(cleanUpOtherTest);

const windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

test('Group testing', async () => {
  // Open Electron
  const { windowA } = await createGroup();
  // Change the name of the group and check that it syncs to all devices (config messages)
  // Click on group avatar to open settings
  await windowA.click('.module-conversation-header__avatar');
  // Click on edit group name
  await clickOnMatchingText(windowA, 'Edit group name');
  // Fill in new group name in input box
  await windowA.fill('.profile-name-input', 'newGroupName');
  // Click OK
  await clickOnMatchingText(windowA, 'OK');
  expect(await windowA.innerText('.group-settings>h2')).toBe('newGroupName');
  expect(await windowA.innerText('[data-testid=readable-message]')).toBe(
    "Group name is now 'newGroupName'."
  );
  // Check to see that you can't change group name to empty string
  // Click on edit group name
  await clickOnMatchingText(windowA, 'Edit group name');
  // Fill in new group name in input box
  await windowA.fill('.profile-name-input', '   ');
  await windowA.keyboard.press('Enter');
  const errorMessage = windowA.locator('.error-message');
  await expect(errorMessage).toContainText('Please enter a group name');
  await clickOnMatchingText(windowA, 'Cancel');
  // Check to see if you can leave group and all members get config message
});
