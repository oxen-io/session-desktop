"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newUser = void 0;
const newUser = async (window) => {
    // Create User
    await window.click('text=Create Session ID');
    // Wait for animation for finish creating ID 
    await window.waitForTimeout(1500);
    //Save session ID to a variable
    const sessionid = await window.inputValue('.session-id-editable-textarea');
    await window.click('text=Continue');
    // Input username = testuser
    const userName = 'testuser';
    await window.fill('#session-input-floating-label', userName);
    await window.click('text=Get Started');
    return userName, sessionid;
};
exports.newUser = newUser;
//# sourceMappingURL=new_user.js.map