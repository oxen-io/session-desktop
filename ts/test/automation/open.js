const { _electron: electron, test, expect } = require('@playwright/test');

(async () => {
  // Launch Electron app.
  const electronApp = await electron.launch({ args: ['main.js'] });
})().catch( e => { console.error(e) });