const { _electron: electron, test, expect, locator } = require('@playwright/test');

const config = {
  use: {
    video: 'retain-on-failure',
  },
};


(async () => {
    test('Create User', async() => {
    // Launch Electron app.
      const electronApp = await electron.launch({ args: ['main.js'] });
    
      // Evaluation expression in the Electron context.
      const appPath = await electronApp.evaluate(async ({ app }) => {
        return app.getAppPath();
      });
    
      // Get the first window that the app opens, wait if necessary.
      const window = await electronApp.firstWindow();
  
      // window.on('console', console.log);
      // Create User
      await window.click('text=Create Session ID');
      //Save session ID to a variable
      await window.pause();
      // await window.waitForSelector('.session-id-editable-textarea');
      const sessionid = await window.inputValue('.session-id-editable-textarea');
      console.log('sessionid: ', sessionid);
      await window.click('text=Continue');
      await window.fill('#session-input-floating-label', 'testuser');
      await window.click('text=Get Started');
      // await window.pause();
      // await window.click('text=Reveal Recovery Phrase');
      // await window.click('.session-modal__header__close > .session-icon-button');

      //OPen user info and verify username and session Id is correct
      await window.click('.module-left-pane__sections-container > div:nth-child(1)');
      //check username matches
      //await window.innerText('.profile-name-uneditable');
      
      //check session id matches
      expect(await window.innerText('.text-selectable.session-id-section-display')).toBe(sessionid);
      await window.click('.session-icon-button.small');

      // Cleanup device 
      await window.click('.module-left-pane__sections-container > div:nth-child(4)');
      await window.click('text=Clear All Data');
      await window.click('text=Device Only');
      await window.click('text=I am sure');
      await window.pause();
      // Exit app and verify deletion
      // await electronApp.close({ headless:false , slowMo:100});
      // await electron.launch({ args: ['main.js'] });
      // await electronApp.close();
  });
  })().catch( e => { console.error(e) });

  