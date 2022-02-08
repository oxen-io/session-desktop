import { Page } from 'playwright-core';

export async function waitForTestIdWithText(window: Page, dataTestId: string, text: string) {
  const builtSelector = `css=[data-testid=${dataTestId}]:has-text("${text}")`;
  console.warn('looking for selector', builtSelector);
  return window.waitForSelector(builtSelector);
}

export async function waitForReadableMessageWithText(window: Page, text: string) {
  return waitForTestIdWithText(window, 'readable-message', text);
}

export async function clickOnMatchingText(window: Page, text: string) {
  return window.click(`"${text}"`);
}

export function getMessageTextContentNow() {
  return `Test message timestamp: ${Date.now()}`;
}
