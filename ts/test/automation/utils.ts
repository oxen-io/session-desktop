import { Page } from 'playwright-core';

export async function waitForTestIdWithText(window: Page, dataTestId: string, text?: string) {
  const builtSelector = `css=[data-testid=${dataTestId}]:has-text("${text}")`;
  console.warn('looking for selector', builtSelector);
  await window.waitForSelector(builtSelector, { timeout: 55000 });
  console.warn('found selector', builtSelector);
}

export async function waitForReadableMessageWithText(window: Page, text: string) {
  return waitForTestIdWithText(window, 'readable-message', text);
}

export async function waitForMatchingText(window: Page, text: string) {
  const builtSelector = `css=:has-text("${text}")`;
  console.warn(`waitForMatchingText: ${text}`);

  await window.waitForSelector(builtSelector, { timeout: 55000 });

  console.warn(`got matchingText: ${text}`);
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
