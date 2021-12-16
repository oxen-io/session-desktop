"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newUser = void 0;
const newUser = async (window, userName) => {
    // Create User
    await window.click('text=Create Session ID');
    // Wait for animation for finish creating ID 
    await window.waitForTimeout(1500);
    //Save session ID to a variable
    const sessionid = await window.innerText('.session-id-editable-textarea');
    await window.click('text=Continue');
    // Input username = testuser
    await window.fill('#session-input-floating-label', userName);
    await window.click('text=Get Started');
    await window.click('[data-testid=settings-section');
    await window.click('text=Recovery Phrase');
    await window.click('[data-testid=reveal-recovery-phrase]');
    // await window.click('text=Copy'); 
    const recoveryPhrase = await window.inputValue('.session-modal__text-highlight');
    // console.log(recoveryPhrase);
    return { userName, sessionid, recoveryPhrase };
};
exports.newUser = newUser;
//# sourceMappingURL=new_user.js.map