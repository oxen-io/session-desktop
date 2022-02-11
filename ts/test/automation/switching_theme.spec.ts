import { _electron, expect, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';
import { openAppsAndNewUsers } from './new_user';
import { clickOnTestIdWithText } from './utils';

test.beforeEach(cleanUpOtherTest);
let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

function getWindowReduxState() {
  return window.inboxStore?.getState();
}

test('Switch themes', async () => {
  // Open App
  // Create User
  const windowLoggedIn = await openAppsAndNewUsers(1);
  windows = windowLoggedIn.windows;
  const [windowA] = windows;
  // Click theme button
  await clickOnTestIdWithText(windowA, 'theme-section');

  // Check background colour of background
  const element = await windowA.waitForSelector('.inbox');
  const color = await windowA.evaluate(`(async() => {
    console.log('1');
    return 888
 })()`);

  expect(color).toBe('#171717');
  // const color = await windowA.locator('.inbox').evaluate(el => window.getComputedStyle(el).color);
  // expect(color === '#171717').toBeTruthy;

  // click theme button again
  // Check background colour again
});
