import { _electron, Page, test } from '@playwright/test';
import { openApp } from './setup/open';
import { cleanUpOtherTest, forceCloseAllWindows } from './setup/beforeEach';
import { newUser } from './setup/new_user';
import { clickOnTestIdWithText } from './utils';
// import { useAvatarPath } from '../../hooks/useParamSelector';

let window: Page | undefined;

test.beforeEach(cleanUpOtherTest);
test.afterEach(async () => {
  if (window) {
    await forceCloseAllWindows([window]);
  }
});

test.skip('Change profile picture', async () => {
  window = await openApp('1');

  await newUser(window, 'userA');
  // Open profile
  await clickOnTestIdWithText(window, 'leftpane-primary-avatar');
  // Click on current profile picture

  const [fileChooser] = await Promise.all([
    window.waitForEvent('filechooser'),
    window.locator('"Edit"').click(),
  ]);
  await fileChooser.setFiles('./fixtures/new_profile_photo.jpeg');

  // useAvatarPath('./fixtures/new_profile_photo.jpeg');
});
