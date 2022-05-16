import { _electron } from '@playwright/test';
export const NODE_ENV = 'production';
export const MULTI_PREFIX = 'test-integration';

export const openApp = async (multi: string) => {
  process.env.NODE_APP_INSTANCE = `${MULTI_PREFIX}-${multi}`;
  process.env.NODE_ENV = NODE_ENV;

  console.warn(' NODE_ENV', process.env.NODE_ENV);
  console.warn(' NODE_APP_INSTANCE', process.env.NODE_APP_INSTANCE);
  const electronApp = await _electron.launch({ args: ['main.js'] });
  // Get the first window that the app opens, wait if necessary.
  const window = await electronApp.firstWindow();

  await window.reload();
  return window;
};
