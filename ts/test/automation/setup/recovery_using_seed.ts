import { _electron, Page } from '@playwright/test';
import { clickOnTestIdWithText } from '../utils';

export async function recoverFromSeed(window: Page, userName: string, recoveryPhrase: string) {
  await clickOnTestIdWithText(window, 'restore-using-recovery');
  await window.fill('[data-testid=recovery-phrase-input]', recoveryPhrase);
  await window.fill('[data-testid=display-name-input]', userName);
  await clickOnTestIdWithText(window, 'continue-session-button');
}
