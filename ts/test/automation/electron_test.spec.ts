import { _electron, test, expect }  from '@playwright/test';
import { cleanUp } from './clean_up';
import { newUser } from './new_user';
import { openApp } from './open';


test('Create User', async() => {
  // Launch Electron app.
    const window = await openApp();
    // Create User
    const user = await newUser(window, 'testuser');

    await window.click('[data-testid=leftpane-primary-avatar]');
    //check username matches
    expect(await window.innerText('[data-testid=your-profile-name]')).toBe(user.userName);
    //check session id matches
    expect(await window.innerText('[data-testid=your-session-id]')).toBe(user.sessionid);
    // Exit profile module
    await window.click('.session-icon-button.small');
    // Cleanup device 
    await cleanUp(window);
    
  });