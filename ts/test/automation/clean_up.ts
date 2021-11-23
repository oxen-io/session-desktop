// import { any } from "underscore";
// import { TestUtils } from "../test-utils";

import { _electron as electron, ElectronApplication, Page } from 'playwright';   
exports.CleanUp = class CleanUp {
    window: any;
    settingsTab: Element;
    clearAllOption: Text;
    deviceOnlyOption: Text;
    confirmOption: Text;

  //locators
    constructor(window: any) {
      this.window = window;
      this.settingsTab = window.getByTestId('settings-section');
      this.clearAllOption = window.locator('text=Clear All Data');
      this.deviceOnlyOption = window.locator('text=Device Only');
      this.confirmOption = window.locator('text=I am sure');
    }
    async deleteData() {
      await this.window.click(this.settingsTab);
      await this.window.click(this.clearAllOption);
      await this.window.click(this.deviceOnlyOption);
      await this.window.click(this.confirmOption);
    }
};


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

    