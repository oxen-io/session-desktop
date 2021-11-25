const { _electron: electron, test, expect } = require('@playwright/test');

export const newUser = async (window: Page) => {
    const electronApp = await _electron.launch({ args: ['main.js'] });
      await electronApp.evaluate(async ({ app }) => {
        return app.getAppPath();
      });
      // Get the first window that the app opens, wait if necessary.
      const window = await electronApp.firstWindow();
      // Create User
      await window.click('text=Create Session ID');
      // Wait for animation for finish creating ID 
      await window.waitForTimeout(1500);
      //Save session ID to a variable
      const sessionid = await window.inputValue('.session-id-editable-textarea');
      await window.click('text=Continue');
      // Input username = testuser
      await window.fill('#session-input-floating-label', 'testuser');
      await window.click('text=Get Started');
}