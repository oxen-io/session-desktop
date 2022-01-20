import { _electron, expect, test } from '@playwright/test';
import { newUser } from './new_user';
import { openApp } from './open';
import { sendMessage } from './send_message';

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
  await sendMessage(windowA, userB.sessionid, sentText);
  // const foundElement = await windowA.waitForSelector(
  //   `[data-testid=readable-message] :has-text('${sentText}')`
  // );
  // console.warn('found message item with matching text?', Boolean(foundElement));
  // const tickMessageSent = await foundElement.waitForSelector(
  //   '[data-testid=msg-status-outgoing][data-testtype=sent]'
  // );
  // console.warn('found the tick of message sent?', Boolean(tickMessageSent));
  // await windowA.waitForTimeout(5500);
  // User B sends message to User B to USER A
  await sendMessage(windowB, userA.sessionid, sentReplyText);
  // await windowA.waitForTimeout(5500);
  // Navigate to contacts tab in User B's window
  await windowB.click('[data-testid=contact-section]');
  // await windowA.waitForTimeout(4500);
  expect(await windowB.innerText('.module-conversation__user__profile-name')).toBe(userA.userName);
  // Navigate to contacts tab in User A's window
  await windowA.click('[data-testid=contact-section]');

  await windowA.waitForSelector(
    `[data-testid=module-conversation__user__profile-name] :has-text('${userB.userName}')`
  );
});
