import { _electron, Page } from '@playwright/test';
import _ from 'lodash';
import { clickOnTestIdWithText } from '../utils';
import { openApp } from './open';
const multisAvailable = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export type UserLoggedInType = {
  userName: string;
  sessionid: string;
  recoveryPhrase: string;
};

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

export async function openAppsNoNewUsers(windowToCreate: number) {
  if (windowToCreate >= multisAvailable.length) {
    throw new Error(`Do you really need ${multisAvailable.length} windows?!`);
  }
  // if windowToCreate = 3, this array will be ABC. If windowToCreate = 5, this array will be ABCDE
  const multisToUse = multisAvailable.slice(0, windowToCreate);
  return Promise.all(
    [...multisToUse].map(async m => {
      return openApp(m);
    })
  );
}

export async function existingUser() {
  const recoveryPhraseTest =
    'pinched total ongoing sushi etched rest gone long oilfield incur code grunt code';
  const newUsername = 'new-username';
  // const sessionIDTest = '05560802be231abc2fbaa860f09da4c2f20dafa4e5f560f77d61c5f587ef2c741f';
  // const contactOne = 'Fish';
  // const contactTwo = 'Dragon';
  // const contactThree = 'Whale';
  // const contactFour = 'Gopher';
  const [windowA1] = await openAppsNoNewUsers(1);

  await clickOnTestIdWithText(windowA1, 'restore-using-recovery');
  await windowA1.fill('[data-testid=recovery-phrase-input]', recoveryPhraseTest);
  await windowA1.fill('[data-testid=display-name-input]', newUsername);
  await clickOnTestIdWithText(windowA1, 'continue-session-button');
  // await clickOnTestIdWithText(windowA1, 'leftpane-primary-avatar');
  // const sessionIDTest = await waitForTestIdWithText(windowA1, 'your-session-id');
  return existingUser;
}
