import { _electron, Page, test } from '@playwright/test';
import { openAppsNoNewUsers } from './setup/new_user';
import { cleanUpOtherTest, forceCloseAllWindows } from './setup/beforeEach';
import { logIn } from './setup/log_in';
import { testUser } from './setup/test_user';
import { clickOnTestIdWithText, typeIntoInput, waitForTestIdWithText } from './utils';

test.beforeEach(cleanUpOtherTest);

let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

test('Mentions', async () => {
  const [windowA] = await openAppsNoNewUsers(1);
  windows = [windowA];
  await logIn(windowA, testUser.recoveryPhrase);
  await clickOnTestIdWithText(
    windowA,
    'module-conversation__user__profile-name',
    'Test Group Name'
  );
  await typeIntoInput(windowA, 'message-input-text-area', '@');
  // does 'message-input-text-area' have aria-expanded: true when @ is typed into input
  await waitForTestIdWithText(windowA, 'mentions-popup-row');
});
