"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const new_user_1 = require("./new_user");
// import { logIn } from './log_in';
const open_1 = require("./open");
// import { cleanUp } from './clean_up';
const userADisplayName = 'userA';
const userBDisplayName = 'userB';
// Send message in one to one conversation with new contact
(0, test_1.test)('Send message to new contact', async () => {
    const [window, window2] = await Promise.all([(0, open_1.openApp)('1'), (0, open_1.openApp)('2')]);
    // create userA 
    const userA = await (0, new_user_1.newUser)(window, userADisplayName);
    // create userB
    const userB = await (0, new_user_1.newUser)(window2, userBDisplayName);
    // SEND MESSAGE TO USER B FROM USER A
    // Click + button for new conversation
    await window.click('[data-testid=new-conversation-button]');
    // Enter session ID of USER B
    await window.fill('.session-id-editable-textarea', userB.sessionid);
    // click next
    await window.click('text=Next');
    // type into message input box
    await window.fill('[data-testid=message-input] * textarea', 'Sending test message');
    // click up arrow (send)
    await window.click('[data-testid=send-message-button]');
    // Navigate to conversation with USER A
    await window2.click('[data-testid=message-section]');
    await window2.click('.module-conversation-list-item__header');
    (0, test_1.expect)(await window2.innerText('.module-conversation__user__profile-name')).toBe(userA.userName);
    // Send message back to USER A
    await window2.fill('[data-testid=message-input] * textarea', 'Sending reply message');
    await window2.click('[data-testid=send-message-button]');
    // Navigate to contacts tab
    await window2.click('[data-testid=contact-section]');
    (0, test_1.expect)(await window2.innerText('.module-conversation__user__profile-name')).toBe(userA.userName);
});
//# sourceMappingURL=new_contact_test.spec.js.map