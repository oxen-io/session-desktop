import { _electron, Page } from '@playwright/test';

export const messageSent = async (window: Page, message: string) => {
  // type into message input box
  await window.fill('[data-testid=message-input] * textarea', message);
  // click up arrow (send)
  await window.click('[data-testid=send-message-button]');
  // wait for confirmation tick to send reply message
  const selc = `css=[data-testid=readable-message]:has-text("${message}"):has([data-testid=msg-status-outgoing][data-testtype=sent])`; //[data-testid=msg-status-outgoing][data-testtype=sent]
  console.warn('waiting for sent tick of message: ', message);

  const tickMessageSent = await window.waitForSelector(selc, { timeout: 30000 });
  console.warn('found the tick of message sent: ', message, Boolean(tickMessageSent));
};
