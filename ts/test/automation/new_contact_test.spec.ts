import { _electron, test }  from '@playwright/test';
import { newUser } from './new_user';
import { logIn } from './log_in';
import { openApp } from './open';
import { cleanUp } from './clean_up';

const userADisplayName ='userA'
const userBDisplayName ='userB'


// Send message in one to one conversation with new contact
test('Send message to new contact', async() => {

  const [window, window2] = await Promise.all([openApp('1'), openApp('2')])

  // create userA 
  const userA = await newUser(window, userADisplayName);
  // log out of UserA
  // await cleanUp(window);
  // create userB
  const userB = await newUser(window2, userBDisplayName);
  // SEND MESSAGE TO USER A
  // Click + button for new conversation
  await window.click('[data-testid=new-conversation-button]');
  // Enter session ID of USER B
  await window.fill('.session-id-editable-textarea', userB.sessionid);
  // click next
  await window.click('[data-testid=next-button');
  // type into message input box
  await window.fill('.send-message-input', 'Sending test message');
  // click up arrow (send)
  await window.click('[data-testid=send-message-button');
  // confirm that tick appears next to message
  await window.waitForSelector('[data-testid=msg-status-outgoing]');
  await window.waitForSelector(`[data-test-name=convo-item-${userADisplayName}]`);
  // log out of User B
  await cleanUp(window);
  // login as User A
  await logIn(window, userA.userName, userA.recoveryPhrase);
  // Navigate to conversation with USER B
  await window.click('[data-testid=message-section');
  // check message was delivered correctly
  await window.click()
  // Send message back to USER A
  // Check that USER A was correctly added as a contact
})






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


