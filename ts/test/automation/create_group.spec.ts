import { _electron, Page, test } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';
import { messageSent } from './message';
import { openAppsAndNewUsers, UserLoggedInType } from './new_user';
import { sendNewMessage } from './send_message';
import {
  clickOnMatchingText,
  getMessageTextContentNow,
  waitForReadableMessageWithText,
  waitForTestIdWithText,
} from './utils';

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

    await sendNewMessage(windowA, userB.sessionid, testMessage);
    await sendNewMessage(windowB, userA.sessionid, testReply);
    await sendNewMessage(windowA, userC.sessionid, testMessage);
    await sendNewMessage(windowC, userA.sessionid, testReply);
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
    await clickOnMatchingText(windowB, testGroupName);

    await waitForTestIdWithText(windowB, 'header-conversation-name', testGroupName);
    // Send message in group chat from user a
    const msgAToGroup = getMessageTextContentNow();

    await messageSent(windowA, msgAToGroup);
    // Verify it was received by other two accounts
    // Navigate to group in window B
    await windowB.click('[data-testid=message-section]');
    // Click on test group
    await clickOnMatchingText(windowB, testGroupName);
    // wait for selector 'test message' in chat window
    await waitForReadableMessageWithText(windowB, msgAToGroup);

    // Send reply message
    const msgBToGroup = getMessageTextContentNow();

    await messageSent(windowB, msgBToGroup);
    // Navigate to group in window C
    await windowC.click('[data-testid=message-section]');
    // Click on test group
    await clickOnMatchingText(windowC, testGroupName);
    // windowC must see the message from A and the message from B
    await waitForReadableMessageWithText(windowC, msgAToGroup);
    await waitForReadableMessageWithText(windowC, msgBToGroup);

    // Send message from C to the group
    const msgCToGroup = getMessageTextContentNow();
    await messageSent(windowC, msgCToGroup);
    // windowA should see the message from B and the message from C
    await waitForReadableMessageWithText(windowA, msgBToGroup);
    await waitForReadableMessageWithText(windowA, msgCToGroup);
  });
});
