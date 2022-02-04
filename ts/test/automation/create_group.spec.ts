import { _electron, test } from '@playwright/test';
import { messageSent } from './message';
import { newUser } from './new_user';
import { openApp } from './open';
import { sendNewMessage } from './send_message';

const userADisplayName = 'userA';
const userBDisplayName = 'userB';
const userCDisplayName = 'userC';

const testMessage = 'Sending Test Message';
const testReply = 'Sending Reply Test Message';
const testGroupName = 'Test Group Name';

test('Create group', async () => {
  // Open Electron
  const [windowA, windowB, windowC] = await Promise.all([openApp('1'), openApp('2'), openApp('3')]);
  // Create User x3
  // create userA
  const userA = await newUser(windowA, userADisplayName);
  // create userB
  const userB = await newUser(windowB, userBDisplayName);
  // Create UserC
  const userC = await newUser(windowC, userCDisplayName);
  // Add contact
  await sendNewMessage(windowA, userB.sessionid, testMessage);
  await sendNewMessage(windowB, userA.sessionid, testReply);
  await sendNewMessage(windowA, userC.sessionid, testMessage);
  await sendNewMessage(windowC, userA.sessionid, testReply);
  // Create group with existing contact and session ID (of non-contact)
  // Click new closed group tab
  await windowA.click('"New Closed Group"');
  // Enter group name
  await windowA.fill('.group-id-editable-textarea', testGroupName);
  // Select user B
  await windowA.click("'userB'");
  // Select user C
  await windowA.click("'userC'");

  // Click Done
  await windowA.click('"Done"');
  // Check group was successfully created
  windowA.locator(`text=${userBDisplayName}, ${userCDisplayName} + 'You joined the group'`);
  // Send message in group chat from user a
  await windowA.click("'Test Group Name'");
  await messageSent(windowA, testMessage);
  // Verify it was received by other two accounts
  // Navigate to group in window B
  await windowB.click('[data-testid=message-section]');
  // Click on test group
  await windowB.click(testGroupName);
  // wait for selector 'test message' in chat window
  await windowB.waitForSelector(`[data-testid=] :has-text('${testMessage}')`);
  // Send reply message
  await messageSent(windowB, `${testReply}-B`);
  // Navigate to group in window C
  await windowC.click('[data-testid=message-section]');
  // Click on test group
  await windowC.click(testGroupName);
  // wait for selector 'test message' in chat window
  await windowC.waitForSelector(`[data-testid=] :has-text('${testMessage}')`);
  // Send reply message
  await messageSent(windowC, `${testReply}-C`);
  // Verify in window A that user b sent message
  await windowA.waitForSelector(`[data-testid=] :has-text('${testMessage}-B')`);
  // Verify in window A that user c sent message
  await windowA.waitForSelector(`[data-testid=] :has-text('${testMessage}-C')`);
});
