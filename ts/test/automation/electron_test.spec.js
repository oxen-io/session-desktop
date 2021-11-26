"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const clean_up_1 = require("./clean_up");
const new_user_1 = require("./new_user");
const open_1 = require("./open");
test_1.test('Create User', async () => {
    // Launch Electron app.
    const window = await open_1.openApp();
    // Create User
    const userName = await new_user_1.newUser(window);
    const sessionid = await new_user_1.newUser(window);
    // await window.click('text=Create Session ID');
    // // Wait for animation for finish creating ID 
    // await window.waitForTimeout(1500);
    // //Save session ID to a variable
    // const sessionid = await window.inputValue('.session-id-editable-textarea');
    // await window.click('text=Continue');
    // // Input username = testuser
    // await window.fill('#session-input-floating-label', 'testuser');
    // await window.click('text=Get Started');
    //OPen user info and verify username and session Id is correct
    await window.click('[data-testid=leftpane-primary-avatar]');
    //check username matches
    test_1.expect(await window.innerText('[data-testid=your-profile-name]')).toBe(userName);
    //check session id matches
    test_1.expect(await window.innerText('[data-testid=your-session-id]')).toBe(sessionid);
    // Exit profile module
    await window.click('.session-icon-button.small');
    // Cleanup device 
    await clean_up_1.cleanUp(window);
});
// import fs from 'fs-extra';
// import pify from 'pify';
// import fs from 'fs';
// import { app } from 'electron';
// import userConfig from '../../../app/user_config';
// import ephemeralConfig from '../../../app/ephemeral_config';
// import sql from '../../../app/sql';
// const getRealPath = pify(fs.realpath);
// export async function removeDB(appPath: string) {
//   const userDir = await getRealPath(appPath);
//   await sql.removeDB(userDir);
//   try {
//     console.warn('Remove DB: removing.', appPath);
//     fs.unlink(appPath, () => {
//       // callback
//       console.log("App data cleared");
//       // You should relaunch the app after clearing the app settings.
//       // app.exit();
//     });
//     userConfig.remove();
//     ephemeralConfig.remove();
//   } catch (e) {
//     console.warn('Remove DB: Failed to remove configs.', e);
//   }
// }
//# sourceMappingURL=electron_test.spec.js.map