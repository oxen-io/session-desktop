"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
// import { cleanUp } from './clean_up';
const new_user_1 = require("./new_user");
const open_1 = require("./open");
const Promise_1 = require("../../session/utils/Promise");
// import {emptyDirSync} from 'fs-extra';
let window;
// test.afterEach(async () => {
//   if(window) {
//     await cleanUp(window)
//   }
// })
// test.beforeAll( () => {
//   emptyDirSync('~/Library/Application\ Support/Session-test-integration-1')
//   emptyDirSync('~/Library/Application\ Support/Session-test-integration')
//   emptyDirSync('~/Library/Application\ Support/Session-test-integration-2')
// })
(0, test_1.test)('Create User', async () => {
    // Launch Electron app.
    window = await (0, open_1.openApp)('1');
    // Create User
    const userA = await (0, new_user_1.newUser)(window, 'userA');
    await window.click('[data-testid=leftpane-primary-avatar]');
    await (0, Promise_1.sleepFor)(100);
    //check username matches
    console.log('blah');
    (0, test_1.expect)(await window.innerText('[data-testid=your-profile-name]')).toBe(userA.userName);
    //check session id matches
    console.log(userA.userName);
    console.log(userA.sessionid);
    (0, test_1.expect)(await window.innerText('[data-testid=your-session-id]')).toBe(userA.sessionid);
    // Exit profile module
    await window.click('.session-icon-button.small');
    // await cleanUp(window);
});
//# sourceMappingURL=electron_test.spec.js.map