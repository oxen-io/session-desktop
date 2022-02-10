import { Page } from 'playwright-core';

export async function waitForTestIdWithText(window: Page, dataTestId: string, text?: string) {
  const builtSelector = `css=[data-testid=${dataTestId}]:has-text("${text}")`;
  console.warn('looking for selector', builtSelector);
  return window.waitForSelector(builtSelector);
}

export async function waitForReadableMessageWithText(window: Page, text: string) {
  return waitForTestIdWithText(window, 'readable-message', text);
}

export async function clickOnMatchingText(window: Page, text: string, rightButton = false) {
  return window.click(`"${text}"`, rightButton ? { button: 'right' } : undefined);
}

export async function clickOnTestIdWithText(window: Page, dataTestId: string, text?: string) {
  if (text) {
    return window.click(`css=[data-testid=${dataTestId}]:has-text("${text}")`);
  }

  const builtSelector = `css=[data-testid=${dataTestId}]`;
  return window.click(builtSelector);
}

export function getMessageTextContentNow() {
  return `Test message timestamp: ${Date.now()}`;
}

export async function waitForMatchingText(window: Page, text: string) {
  return window.click(`"${text}"`);
}
