import { _electron, expect, test, Page } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';
import { newUser } from './new_user';
import { openApp } from './open';
import { sendNewMessage } from './send_message';

const userADisplayName = 'userA';
const userBDisplayName = 'userB';

const timeStamp = Date.now();

const testMessage = 'Test-Message-';
const testReply = 'Reply-Test-Message-';
test.beforeEach(cleanUpOtherTest);

let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

// Send message in one to one conversation with new contact
test('Send message to new contact', async () => {
  windows = await Promise.all([openApp('1'), openApp('2')]);
  const [windowA, windowB] = windows;
  // Create User A
  const userA = await newUser(windowA, userADisplayName);
  // Create User B
  const userB = await newUser(windowB, userBDisplayName);
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
  // Wait for contact name to change
  // =======
  // User A sends message to User B
  // await sendMessage(windowA, userB.sessionid, `${testMessage} + ${timeStamp}`);
  // windowA.locator(`${testMessage} > svg`).waitFor;
  // await windowA.isVisible('[data-testid=msg-status-outgoing]');
  // await windowA.waitForTimeout(5500);
  // // User B sends message to User B to USER A
  // await sendMessage(windowB, userA.sessionid, `${testReply} + ${timeStamp}`);
  // await windowA.waitForTimeout(5500);
  // // Navigate to contacts tab in User B's window
  // await windowB.click('[data-testid=contact-section]');
  // await windowA.waitForTimeout(2500);
  // expect(await windowB.innerText('.module-conversation__user__profile-name')).toBe(userA.userName);
  // // Navigate to contacts tab in User A's window
  // await windowA.click('[data-testid=contact-section]');
  // expect(await windowA.innerText('.module-conversation__user__profile-name')).toBe(userB.userName);
  // >>>>>>> origin/clearnet
});
