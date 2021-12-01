import { _electron, test, expect }  from '@playwright/test';
import { newUser } from './new_user';
import { logIn } from './log_in';
import { openApp } from './open';
import { cleanUp } from './clean_up';


// Send message in one to one conversation with new contact
test('Send message to new contact', async() => {
  const window = await openApp();
  // create userA 
  const userA = await newUser(window, 'user A');
  // log out of UserA
  await cleanUp(window);
  // create userB
  const userB = await newUser(window, 'user B');
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
  expect (await window.isVisible('.sc-fzplWN hRBsWH')).toBeTruthy();
  // log out of User B
  await cleanUp(window);
  // login as User A
  await logIn(window, userA.userName, userA.recoveryPhrase);
  // Log into USER B account
  // Navigate to conversation with USER A
  // check message was delivered correctly
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


