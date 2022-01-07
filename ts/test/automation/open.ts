import { _electron } from '@playwright/test';

export const openApp = async (multi: string) => {
  process.env.NODE_APP_INSTANCE = multi;
  process.env.NODE_ENV = 'test-integration';
  const electronApp = await _electron.launch({ args: ['main.js'] });
  await electronApp.evaluate(async ({ app }) => {
    return app.getAppPath();
  });
  // Get the first window that the app opens, wait if necessary.
  const window = await electronApp.firstWindow();

  await window.reload();
  return window;
};
