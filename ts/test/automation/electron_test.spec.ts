import { _electron, test, expect }  from '@playwright/test';

import pify from 'pify';
import fs from 'fs';

const { app } = require('electron');

import userConfig from '../../../app/user_config';
import ephemeralConfig from '../../../app/ephemeral_config';
import sql from '../../../app/sql';

const getRealPath = pify(fs.realpath);

export async function removeDB(appPath: string) {
  const userDir = await getRealPath(appPath);
  await sql.removeDB(userDir);

  try {
    console.warn('Remove DB: removing.', appPath);

    fs.unlink(appPath, () => {
      // callback
      console.log("App data cleared");
      // You should relaunch the app after clearing the app settings.
      // app.exit();
    });

    // userConfig.remove();
    // ephemeralConfig.remove();
  } catch (e) {
    console.warn('Remove DB: Failed to remove configs.', e);
  }
}

test('Create User', async() => {
  // Launch Electron app.
    const electronApp = await _electron.launch({ args: ['main.js'] });
    const appPath = await electronApp.evaluate(async ({ app }) => {
      return app.getAppPath();
    });

    // await removeDB(appPath);
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
    //OPen user info and verify username and session Id is correct
    await window.click('[data-testid=leftpane-primary-avatar]');
    //check username matches
    expect(await window.innerText('[data-testid=your-profile-name]')).toBe('testuser');
    //check session id matches
    expect(await window.innerText('[data-testid=your-session-id]')).toBe(sessionid);
    // Exit profile module
    await window.click('.session-icon-button.small');
    // Cleanup device 
    // await window.click('[data-testid=settings-section]');
    // await window.click('text=Clear All Data');
    // await window.click('text=Device Only');
    // await window.click('text=I am sure');
    // Wait for data to delete

    await removeDB(appPath);

    await window.waitForTimeout(1000);
  });


  