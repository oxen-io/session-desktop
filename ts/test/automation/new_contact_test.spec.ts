import { _electron, expect, test } from '@playwright/test';
import { newUser } from './new_user';
import { openApp } from './open';
import { sendMessage } from './send_message';

const userADisplayName = 'userA';
const userBDisplayName = 'userB';

// Send message in one to one conversation with new contact
test('Send message to new contact', async () => {
  const [windowA, windowB] = await Promise.all([openApp('1'), openApp('2')]);
  // Create User A
  const userA = await newUser(windowA, userADisplayName);
  // Create User B
  const userB = await newUser(windowB, userBDisplayName);
  // User A sends message to User B
  await sendMessage(windowA, userB.sessionid, 'Sending Test Message');
  // User B sends message to User B to USER A
  await sendMessage(windowB, userA.sessionid, 'Sending Reply Test Message');
  // Navigate to contacts tab in User B's window
  await windowB.click('[data-testid=contact-section]');
  expect(await windowB.innerText('.module-conversation__user__profile-name')).toBe(userA.userName);
  // Navigate to contacts tab in User A's window
  await windowA.click('[data-testid=contact-section]');
  expect(await windowA.innerText('.module-conversation__user__profile-name')).toBe(userB.userName);
});
