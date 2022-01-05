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
    await window.click('[data-testid=next-button]');
    // type into message input box
    await window.fill('.send-message-input', 'Sending test message');
    // click up arrow (send)
    await window.click('[data-testid=send-message-button');
    // confirm that tick appears next to message
    await window.waitForSelector('[data-testid=msg-status-outgoing]');
    await window.waitForSelector(`[data-test-name=convo-item-${userADisplayName}]`);
    // Navigate to conversation with USER A
    await window2.click('[data-testid=message-section');
    // Send message back to USER A
    // await window.click()
    // Check that USER A was correctly added as a contact
});
// log out from USER A
// cleanUp(window);
// test('blah', async() => {
//   const userA = newUser(window, 'user A')
//   cleanUp(window)
//   const userB = newUser(window, 'user B')
//   // SEND MESSAGE TO USER 
//   cleanUp(window)
//   logIn(window, userA.userName, userA.recoveryPhrase)
// })
//# sourceMappingURL=new_contact_test.spec.js.map