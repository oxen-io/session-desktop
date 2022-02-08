import { Page } from 'playwright-core';

export async function waitForTestIdWithText(window: Page, dataTestId: string, text: string) {
  const builtSelector = `css=[data-testid=${dataTestId}]:text('${text}')`;
  console.warn('looking for selector', builtSelector);
  await window.waitForSelector(builtSelector);
}
