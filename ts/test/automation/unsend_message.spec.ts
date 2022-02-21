import { _electron, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';
import { openAppsAndNewUsers } from './new_user';
import { sendNewMessage } from './send_message';
import {
  clickOnMatchingText,
  clickOnTestIdWithText,
  waitForMatchingText,
  waitForTestIdWithText,
} from './utils';
const timeStamp = Date.now();

const testMessage = 'Test-Message-';
const testReply = 'Reply-Test-Message-';

test.beforeEach(cleanUpOtherTest);
let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

test('Unsend message', async () => {
  // Open App
  const windowLoggedIn = await openAppsAndNewUsers(2);
  windows = windowLoggedIn.windows;
  const users = windowLoggedIn.users;
  const [windowA, windowB] = windows;
  const [userA, userB] = users;
  // Send message between two users
  await sendNewMessage(windowA, userB.sessionid, `${testMessage}${timeStamp}`);
  await sendNewMessage(windowB, userA.sessionid, `${testReply}${timeStamp}`);
  // Unsend message from User A to User B
  // Right click on message
  await windowA.click('.module-message.module-message--outgoing', { button: 'right' });
  // Select delete for everyone
  await clickOnMatchingText(windowA, 'Delete for everyone');
  // Select delete for everyone confirmation
  await clickOnTestIdWithText(windowA, 'session-confirm-ok-button', 'Delete for everyone');
  // Check that toast notification opens and says 'deleted'
  windowA.locator('[data-testid=session-toast]');
  await waitForTestIdWithText(windowA, 'session-toast', 'Deleted');
  // Check that message is deleted in receivers window
  await waitForMatchingText(windowB, 'This message has been deleted');
});
