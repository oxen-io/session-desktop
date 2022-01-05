"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const new_user_1 = require("./new_user");
const open_1 = require("./open");
const Promise_1 = require("../../session/utils/Promise");
// import {emptyDirSync} from 'fs-extra';
let window;
(0, test_1.test)('Create User', async () => {
    // Launch Electron app.
    window = await (0, open_1.openApp)('1');
    // Create User
    const userA = await (0, new_user_1.newUser)(window, 'userA');
    await window.click('[data-testid=leftpane-primary-avatar]');
    await (0, Promise_1.sleepFor)(100);
    //check username matches
    (0, test_1.expect)(await window.innerText('[data-testid=your-profile-name]')).toBe(userA.userName);
    //check session id matches
    (0, test_1.expect)(await window.innerText('[data-testid=your-session-id]')).toBe(userA.sessionid);
    // exit profile module
    await window.click('.session-icon-button.small');
    // check recovery phrase matches
    // go to settings section
    await window.click('[data-testid=settings-section]');
    await window.click('text=Recovery Phrase');
    (0, test_1.expect)(await window.innerText('[data-testid=recovery-phrase-seed-modal]')).toBe(userA.recoveryPhrase);
    // Exit profile module
    await window.click('.session-icon-button.small');
    // await cleanUp(window);
});
//# sourceMappingURL=electron_test.spec.js.map