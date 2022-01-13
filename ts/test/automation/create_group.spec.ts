import { _electron, test } from '@playwright/test';
import { newUser } from './new_user';
import { openApp } from './open';

const userADisplayName = 'userA';
const userBDisplayName = 'userB';
const userCDisplayName = 'userC';

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

  // Create group with existing contact and session ID (of non-contact)
  // Send message in group chat from user 1
  // Verify it was received by other two accounts
  // Send message from user 2
  // Verify
  // Send message from user 3
  // Verify
});
