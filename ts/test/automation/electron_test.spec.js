"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const clean_up_1 = require("./clean_up");
const new_user_1 = require("./new_user");
const open_1 = require("./open");
const Promise_1 = require("../../session/utils/Promise");
const fs_extra_1 = require("fs-extra");
let window;
test_1.test.afterEach(async () => {
    if (window) {
        await clean_up_1.cleanUp(window);
    }
});
test_1.test.beforeAll(() => {
    fs_extra_1.emptyDirSync('~/Library/Application\ Support/Session-test-integration-1');
    fs_extra_1.emptyDirSync('~/Library/Application\ Support/Session-test-integration');
    fs_extra_1.emptyDirSync('~/Library/Application\ Support/Session-test-integration-2');
});
test_1.test('Create User', async () => {
    // Launch Electron app.
    window = await open_1.openApp('1');
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
});
//# sourceMappingURL=electron_test.spec.js.map