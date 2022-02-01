import { _electron, expect, test } from '@playwright/test';
import { newUser } from './new_user';
import { openApp } from './open';
import { sendNewMessage } from './send_message';

const userADisplayName = 'userA';
const userBDisplayName = 'userB';

const timeStamp = Date.now();

const testMessage = 'Test-Message-';
const testReply = 'Reply-Test-Message-';

// Send message in one to one conversation with new contact
test('Send message to new contact', async () => {
  const [windowA, windowB] = await Promise.all([openApp('1'), openApp('2')]);
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
  // await windowA.waitForTimeout(4500);
  expect(await windowB.innerText('.module-conversation__user__profile-name')).toBe(userA.userName);
  // Navigate to contacts tab in User A's window
  await windowA.click('[data-testid=contact-section]');
  // Wait for contact name to change
});
