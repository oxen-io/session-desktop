import { _electron, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';
import { messageSent } from './message';
import { openAppsAndNewUsers, UserLoggedInType } from './new_user';
import { sendNewMessage } from './send_message';
import { waitForTestIdWithText } from './utils';

const testMessage = 'Sending Test Message';
const testReply = 'Sending Reply Test Message';
const testGroupName = 'Test Group Name';
test.beforeEach(cleanUpOtherTest);

let windows: Array<Page> = [];
let users: Array<UserLoggedInType> = [];
test.afterEach(() => forceCloseAllWindows(windows));

test('Create group', async () => {
  await test.step('Create group', async () => {
    // Open Electron
    const windowLoggedIn = await openAppsAndNewUsers(3);
    windows = windowLoggedIn.windows;
    users = windowLoggedIn.users;
    const [windowA, windowB, windowC] = windows;
    // Create User x3
    // create userA, b and C
    const [userA, userB, userC] = users;
    // Add contact
    await Promise.all([
      sendNewMessage(windowA, userB.sessionid, testMessage),
      sendNewMessage(windowB, userA.sessionid, testReply),
    ]);
    await Promise.all([
      sendNewMessage(windowA, userC.sessionid, testMessage),
      sendNewMessage(windowC, userA.sessionid, testReply),
    ]);
    // wait for user C to be contact before moving to create group

    // Create group with existing contact and session ID (of non-contact)
    // Click new closed group tab
    await windowA.click('"New Closed Group"');
    // Enter group name
    await windowA.fill('.group-id-editable-textarea', testGroupName);
    // Select user B
    await windowA.click(`'${userB.userName}'`);
    // Select user C
    await windowA.click(`'${userC.userName}'`);

    // Click Done
    await windowA.click('"Done"');
    // Check group was successfully created
    // await windowA.waitForSelector('[data-testid=readable-message]');
    // Send message in group chat from user a

    await windowB.click(`'${testGroupName}'`);

    await waitForTestIdWithText(windowB, 'header-conversation-name', testGroupName);
    await messageSent(windowA, `${testReply}-A`);
    // Verify it was received by other two accounts
    // Navigate to group in window B
    await windowB.click('[data-testid=message-section]');
    // Click on test group

    await windowB.click("'Test Group Name'");
    // wait for selector 'test message' in chat window
    // await waitForTestIdWithText(windowB, 'readable-message', `${testReply}-A`);

    // console.error('readable message correct found');
    // // Send reply message
    // await messageSent(windowB, `${testReply}-B`);
    // // Navigate to group in window C
    // await windowC.click('[data-testid=message-section]');
    // // Click on test group
    // await windowC.click(testGroupName);
    // // wait for selector 'test message' in chat window
    // await windowC.waitForSelector(`[data-testid=] :has-text('${testMessage}')`);
    // // Send reply message
    // await messageSent(windowC, `${testReply}-C`);
    // // Verify in window A that user b sent message
    // await windowA.waitForSelector(`[data-testid=] :has-text('${testMessage}-B')`);
    // // Verify in window A that user c sent message
    // await windowA.waitForSelector(`[data-testid=] :has-text('${testMessage}-C')`);
  });
});
