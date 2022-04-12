import { _electron, Page, test } from '@playwright/test';
import { openAppsNoNewUsers } from './setup/new_user';
import { cleanUpOtherTest, forceCloseAllWindows } from './setup/beforeEach';
import { logIn } from './setup/log_in';
import {
  testContactFour,
  testContactOne,
  testContactThree,
  testContactTwo,
  testUser,
} from './setup/test_user';
import { clickOnTestIdWithText, typeIntoInput, waitForTestIdWithText } from './utils';

test.beforeEach(cleanUpOtherTest);

let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

test('Mentions', async () => {
  const [window] = await openAppsNoNewUsers(1);
  windows = [window];
  await logIn(window, testUser.recoveryPhrase);
  await clickOnTestIdWithText(window, 'module-conversation__user__profile-name', 'Test Group Name');
  await typeIntoInput(window, 'message-input-text-area', '@');
  // does 'message-input-text-area' have aria-expanded: true when @ is typed into input
  await waitForTestIdWithText(window, 'mentions-popup-row');
  await waitForTestIdWithText(window, 'mentions-popup-row', testContactOne.userName);
  await waitForTestIdWithText(window, 'mentions-popup-row', testContactTwo.userName);
  await waitForTestIdWithText(window, 'mentions-popup-row', testContactThree.userName);
  await waitForTestIdWithText(window, 'mentions-popup-row', testContactFour.userName);
});
