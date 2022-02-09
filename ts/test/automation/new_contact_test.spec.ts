import { _electron, expect, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';

import { sendNewMessage } from './send_message';
import { openAppsAndNewUsers } from './new_user';

const timeStamp = Date.now();

const testMessage = 'Test-Message-';
const testReply = 'Reply-Test-Message-';
test.beforeEach(cleanUpOtherTest);

let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

// Send message in one to one conversation with new contact
test('Send message to new contact', async () => {
  const windowLoggedIn = await openAppsAndNewUsers(2);
  windows = windowLoggedIn.windows;
  const users = windowLoggedIn.users;
  const [windowA, windowB] = windows;
  const [userA, userB] = users;
  const sentText = `${testMessage}${timeStamp}`;
  const sentReplyText = `${testReply}${timeStamp}`;
  // User A sends message to User B
  await sendNewMessage(windowA, userB.sessionid, sentText);
  // User B sends message to User B to USER A
  await sendNewMessage(windowB, userA.sessionid, sentReplyText);
  // Navigate to contacts tab in User B's window
  await windowB.click('[data-testid=contact-section]');
  await windowA.waitForTimeout(1000);
  expect(await windowB.innerText('.module-conversation__user__profile-name')).toBe(userA.userName);
  // Navigate to contacts tab in User A's window
  await windowA.click('[data-testid=contact-section]');
});
