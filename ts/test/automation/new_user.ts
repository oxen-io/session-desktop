import { _electron, Page } from '@playwright/test';
import _ from 'lodash';
import { openApp } from './open';

export type UserLoggedInType = { userName: string; sessionid: string; recoveryPhrase: string };

export const newUser = async (window: Page, userName: string): Promise<UserLoggedInType> => {
  // Create User
  await window.click('text=Create Session ID');
  // Wait for animation for finish creating ID
  await window.waitForTimeout(1500);
  //Save session ID to a variable
  const sessionid = await window.inputValue('[data-testid=session-id-signup]');
  await window.click('text=Continue');
  // Input username = testuser
  await window.fill('#session-input-floating-label', userName);
  await window.click('text=Get Started');
  // save recovery phrase
  await window.click('text=Reveal recovery phrase');
  const recoveryPhrase = await window.innerText('[data-testid=recovery-phrase-seed-modal]');

  await window.click('.session-icon-button.small');
  return { userName, sessionid, recoveryPhrase };
};

const openAppAndNewUser = async (multi: string): Promise<UserLoggedInType & { window: Page }> => {
  const window = await openApp(multi);

  const userName = `${multi}-user`;
  const loggedIn = await newUser(window, userName);
  return { window, ...loggedIn };
};

export async function openAppsAndNewUsers(windowToCreate: number) {
  const multisAvailable = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (windowToCreate >= multisAvailable.length) {
    throw new Error(`Do you really need ${multisAvailable.length} windows?!`);
  }
  // if windowToCreate = 3, this array will be ABC. If windowToCreate = 5, this array will be ABCDE
  const multisToUse = multisAvailable.slice(0, windowToCreate);
  const loggedInDetails = await Promise.all(
    [...multisToUse].map(async m => {
      return openAppAndNewUser(m);
    })
  );

  const windows = loggedInDetails.map(w => w.window);
  const users = loggedInDetails.map(w => {
    return _.pick(w, ['sessionid', 'recoveryPhrase', 'userName']);
  });
  return { windows, users };
}
