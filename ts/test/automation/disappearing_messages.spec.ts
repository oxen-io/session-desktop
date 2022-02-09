import { _electron, Page, test, expect } from '@playwright/test';
import { cleanUpOtherTest, forceCloseAllWindows } from './beforeEach';
import { messageSent } from './message';
import { openAppsAndNewUsers } from './new_user';
import { sendNewMessage } from './send_message';
import { clickOnMatchingText, waitForTestIdWithText } from './utils';

test.beforeEach(cleanUpOtherTest);
let windows: Array<Page> = [];
test.afterEach(() => forceCloseAllWindows(windows));

const timeStamp = Date.now();
const testMessage = 'Test-Message-';
const testReply = 'Reply-Test-Message-';
const sentMessage = `${testMessage}${timeStamp}`;
const sentReplyMessage = `${testReply}${timeStamp}`;

test('Disappearing Messages', async () => {
  // Open App
  // Create User
  const windowLoggedIn = await openAppsAndNewUsers(2);
  windows = windowLoggedIn.windows;
  const users = windowLoggedIn.users;
  const [windowA, windowB] = windows;
  const [userA, userB] = users;
  // Create Contact
  await sendNewMessage(windowA, userB.sessionid, sentMessage);
  await sendNewMessage(windowB, userA.sessionid, sentReplyMessage);
  // Click on user's avatar to open conversation options
  await windowA.click('.module-conversation-header__avatar');
  // Select disappearing messages drop down
  await clickOnMatchingText(windowA, 'Disappearing messages');
  // Select 5 seconds
  await clickOnMatchingText(windowA, '5 seconds');
  // Click chevron to close menu
  await windowA.click('.group-settings-header > .session-icon-button.medium');
  // Check config message
  await waitForTestIdWithText(
    windowA,
    'readable-message',
    'You set the disappearing message timer to 5 seconds'
  );
  // Check top right hand corner indicator
  windowA.locator('[data-testid=disappearing-messages-indicator]');
  // Send message
  // Wait for tick of confirmation
  await messageSent(windowA, sentMessage);
  // Check timer is functioning

  // Verify message is deleted
  await expect(windowA.locator(sentMessage)).toHaveCount(0);
  // Click on user's avatar for options
  await windowA.click('[data-testid=conversation-options-avatar]');
  // Click on disappearing messages drop down
  await clickOnMatchingText(windowA, 'Disappearing messages');
  // Select off
  await clickOnMatchingText(windowA, 'Off');
  // Click chevron to close menu
  await windowA.click('.group-settings-header > .session-icon-button.medium');
  // Check config message
  await waitForTestIdWithText(windowA, 'readable-message', 'You disabled disappearing messages.');
  // Verify message is deleted in windowB for receiver user
  // Check config message in windowB
  windowA.locator(`'${userA.userName}' set the disappearing message timer to 5 seconds`);
  // Wait 5 seconds
  // Check if message from UserA is visible
});
