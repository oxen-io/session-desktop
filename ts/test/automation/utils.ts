import { Page } from 'playwright-core';

export async function waitForTestIdWithText(window: Page, dataTestId: string, text: string) {
  await window.waitForSelector(`[data-testid=${dataTestId}]:has-text('${text}')`);
}
