import { _electron, test, expect }  from '@playwright/test';
import { cleanUp } from './clean_up';
import { newUser } from './new_user';
import { openApp } from './open';
import { sleepFor } from '../../session/utils/Promise';
import {emptyDirSync} from 'fs-extra';


let window: Page | undefined;

test.afterEach(async () => {

  if(window) {
    await cleanUp(window)
  }
})

test.beforeAll( () => {
  emptyDirSync('~/Library/Application\ Support/Session-test-integration-1')
  emptyDirSync('~/Library/Application\ Support/Session-test-integration')
  emptyDirSync('~/Library/Application\ Support/Session-test-integration-2')
  
})


test('Create User', async() => {
// Launch Electron app.
   window = await openApp('1');
  // Create User
  const userA = await newUser(window, 'userA');

  await window.click('[data-testid=leftpane-primary-avatar]');
  await sleepFor(100);
  //check username matches
  expect(await window.innerText('[data-testid=your-profile-name]')).toBe(userA.userName);
  //check session id matches
  expect(await window.innerText('[data-testid=your-session-id]')).toBe(userA.sessionid);
  // Exit profile module
  await window.click('.session-icon-button.small');
    
  });