import { _electron, Page } from '@playwright/test';
import { clickOnMatchingText, clickOnTestIdWithText, waitForTestIdWithText } from './utils';

export const leaveGroup = async (window: Page) => {
  // go to three dots menu
  await clickOnTestIdWithText(window, 'gear-conversation-options');
  // Select Leave Group
  await clickOnMatchingText(window, 'Leave Group');
  // Confirm leave group
  await clickOnTestIdWithText(window, 'session-confirm-ok-button', 'OK');
  // check config message
  await waitForTestIdWithText(window, 'readable-message', 'You have left the group.');
};
