const { _electron: electron, expect } = require('@playwright/test');   
exports.cleanUp = class cleanUp {

  //locators
    constructor(window) {
      this.window = window;
      this.settingsTab = window.locator('.module-left-pane__sections-container > div:nth-child(4)');
      this.clearAllOption = window.locator('text=Clear All Data');
      this.deviceOnlyOption = window.locator('text=Device Only');
      this.confirmOption = window.locator('text=I am sure');
    }
    async deleteData() {
      await this.window.click(this.settingsTab);
      await this.window.click
    }
}

// (async () => {   
//   const electronApp = await electron.launch({ args: ['main.js'] });
 
//   // Evaluation expression in the Electron context.
//   const appPath = await electronApp.evaluate(async ({ app }) => {
//     return app.getAppPath();
//   });

//   // Get the first window that the app opens, wait if necessary.
//   const window = await electronApp.firstWindow();

//       await window.click('.module-left-pane__sections-container > div:nth-child(4)');
//       await window.click('text=Clear All Data');
//       await window.click('text=Device Only');
//       await window.click('text=I am sure');

//     })().catch( e => { console.error(e) });

    