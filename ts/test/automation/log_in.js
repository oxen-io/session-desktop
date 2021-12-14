"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logIn = void 0;
const Promise_1 = require("../../session/utils/Promise");
const logIn = async (window, userName, recoveryPhrase) => {
    // restore account
    await window.click('[data-testid=restore-using-recovery');
    // Enter recovery phrase 
    await window.fill('[data-testid=recovery-phrase-input]', recoveryPhrase);
    // Enter display name
    await window.fill('[data-testid=display-name-input]', userName);
    // Click continue your session
    await window.click('[data-testid=continue-session-button]');
    await Promise_1.sleepFor(100);
};
exports.logIn = logIn;
//# sourceMappingURL=log_in.js.map