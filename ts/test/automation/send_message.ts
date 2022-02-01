import { _electron, Page } from '@playwright/test';
import { messageSent } from './message';

export const sendNewMessage = async (window: Page, sessionid: string, message: string) => {
  await window.click('[data-testid=new-conversation-button]');
  // Enter session ID of USER B
  await window.fill('.session-id-editable-textarea', sessionid);
  // click next
  await window.click('text=Next');
  await messageSent(window, message);
};
