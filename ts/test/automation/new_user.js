"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newUser = void 0;
const newUser = async (window, userName) => {
    // Create User
    await window.click('text=Create Session ID');
    // Wait for animation for finish creating ID 
    await window.waitForTimeout(1500);
    //Save session ID to a variable
    const sessionid = await window.inputValue('.session-id-editable-textarea');
    await window.click('text=Continue');
    // Input username = testuser
    await window.fill('#session-input-floating-label', userName);
    await window.click('text=Get Started');
    await window.click('[data-testid=reveal-recovery-phrase]');
    const recoveryPhrase = await window.inputValue('.session-modal__text-highlight');
    return { userName, sessionid, recoveryPhrase };
};
exports.newUser = newUser;
//# sourceMappingURL=new_user.js.map