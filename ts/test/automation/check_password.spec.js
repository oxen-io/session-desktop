"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const new_user_1 = require("./new_user");
const open_1 = require("./open");
// Open app
let window;
(0, test_1.test)('Check Password', async () => {
    // open Electron
    window = await (0, open_1.openApp)('1');
    // Create user
    await (0, new_user_1.newUser)(window, 'userA');
    // Click on settings tab
    await window.click('[data-testid=settings-section]');
    // Click on privacy
    await window.click('"Privacy"');
    // Click set password
    await window.click('"Set Password"');
    // Enter password
    await window.type('#password-modal-input', '123456');
    // Confirm password
    await window.type('#password-modal-input-confirm', '123456');
    // Click OK
    await window.keyboard.press('Enter');
    // Type password into input field
    await window.fill('#password-lock-input', '123456');
    // Click OK
    await window.click('"OK"');
});
//# sourceMappingURL=check_password.spec.js.map