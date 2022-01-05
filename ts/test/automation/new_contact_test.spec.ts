import { _electron, test, expect }  from '@playwright/test';
import { newUser } from './new_user';
// import { logIn } from './log_in';
import { openApp } from './open';
// import { cleanUp } from './clean_up';

const userADisplayName ='userA'
const userBDisplayName ='userB'


// Send message in one to one conversation with new contact
test('Send message to new contact', async() => {

  const [window, window2] = await Promise.all([openApp('1'), openApp('2')])

  // create userA 
  const userA = await newUser(window, userADisplayName);
  // create userB
  const userB = await newUser(window2, userBDisplayName);
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
  expect(await window2.innerText('.module-conversation__user__profile-name')).toBe(userA);
  // Send message back to USER A
  await window2.fill('[data-testid=message-input] * textarea', 'Sending reply message');
  await window2.click('[data-testid=send-message-button]');
  // Navigate to contacts tab
  await window2.click('[data-testid=contact-section]');
  expect(await window2.innerText('.module-conversation__user__profile-name')).toBe(userA);
})