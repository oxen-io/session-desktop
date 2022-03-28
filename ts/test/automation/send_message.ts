import { _electron, Page } from '@playwright/test';
import { messageSent } from './message';
import { clickOnMatchingText, clickOnTestIdWithText, typeIntoInput } from './utils';

export const sendNewMessage = async (window: Page, sessionid: string, message: string) => {
  await clickOnTestIdWithText(window, 'new-conversation-button');
  // Enter session ID of USER B
  await typeIntoInput(window, 'new-session-conversation', sessionid);
  // click next
  await clickOnMatchingText(window, 'Next');
  await messageSent(window, message);
};
