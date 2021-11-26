import { _electron }  from '@playwright/test';

export const openApp = async () => {
  const electronApp = await _electron.launch({ args: ['main.js'] });
    await electronApp.evaluate(async ({ app }) => {
      return app.getAppPath();
    });
    // Get the first window that the app opens, wait if necessary.
  const window = await electronApp.firstWindow();
  
  return window;
} 

