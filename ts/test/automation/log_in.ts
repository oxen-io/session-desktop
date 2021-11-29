import { _electron, Page }  from '@playwright/test';
import { newUser } from './new_user';
import { sleepFor } from '../../session/utils/Promise';

export const logIn = async ( window: Page, userName: string, recoveryPhrase: string) => {
  // restore account
  await window.click('text=Restore your account');
  // Enter recovery phrase 
  await window.fill( '#session-input-floating-label', recoveryPhrase );
  // Enter display name
  await window.fill( '#session-input-floating-label', userName );
  // Click continue your session
  await window.click('text=Continue your session');

  await sleepFor(100);
}