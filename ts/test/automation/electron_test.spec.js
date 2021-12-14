"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const clean_up_1 = require("./clean_up");
const new_user_1 = require("./new_user");
const open_1 = require("./open");
const Promise_1 = require("../../session/utils/Promise");
test_1.test('Create User', async () => {
    // Launch Electron app.
    const window = await open_1.openApp();
    // Create User
    const userA = await new_user_1.newUser(window, 'userA');
    await window.click('[data-testid=leftpane-primary-avatar]');
    await Promise_1.sleepFor(100);
    //check username matches
    test_1.expect(await window.innerText('[data-testid=your-profile-name]')).toBe(userA.userName);
    //check session id matches
    test_1.expect(await window.innerText('[data-testid=your-session-id]')).toBe(userA.sessionid);
    // Exit profile module
    await window.click('.session-icon-button.small');
    // Cleanup device 
    await clean_up_1.cleanUp(window);
});
//# sourceMappingURL=electron_test.spec.js.map