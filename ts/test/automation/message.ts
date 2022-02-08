import { _electron, Page } from '@playwright/test';
import { waitForTestIdWithText } from './utils';

export const messageSent = async (window: Page, message: string) => {
  // type into message input box
  await window.fill('[data-testid=message-input] * textarea', message);
  // click up arrow (send)
  await window.click('[data-testid=send-message-button]');
  // wait for confirmation tick to send reply message
  const foundElement = await waitForTestIdWithText(window, 'readable-message', message);

  console.warn('found message item with matching text?', Boolean(foundElement));
  const tickMessageSent = await foundElement.waitForSelector(
    '[data-testid=msg-status-outgoing][data-testtype=sent]'
  );
  console.warn('found the tick of message sent', Boolean(tickMessageSent));
};
