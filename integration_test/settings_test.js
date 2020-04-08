/* eslint-disable prefer-destructuring */
/* eslint-disable more/no-then */
/* eslint-disable func-names  */
/* eslint-disable import/no-extraneous-dependencies */
const { after, before, describe, it } = require('mocha');
const { assert } = require('chai');
const common = require('./common');

const commonPage = require('./page-objects/common.page');
const settingsPage = require('./page-objects/settings.page');

describe('Settings', function() {
  let app;
  this.timeout(60000);
  this.slow(15000);

  const testPassword = 'test_password';

  before(async () => {
    await common.killallElectron();
    await common.stopStubSnodeServer();

    const appProps = {
      mnemonic: common.TEST_MNEMONIC1,
      displayName: common.TEST_DISPLAY_NAME1,
      stubSnode: true,
    };

    app = await common.startAndStub(appProps);
    
  });

  after(async () => {
    // await common.stopApp(app);
    // await common.killallElectron();
    // await common.stopStubSnodeServer();
    
  });

  it('can toggle menubar', async () => {
    const menubarOpened = await app.browserWindow.isMenuBarVisible();
    
    // toggle menubar
    await app.client.waitForExist(settingsPage.leftPaneSettingsButton, 500);
    await app.client.element(settingsPage.leftPaneSettingsButton).click();

    await common.timeout(1000);
    await app.client.element(settingsPage.settingToggleWithText('Hide Menu Bar')).click();

    const wasMenubarToggled = (await app.browserWindow.isMenuBarVisible()) !== menubarOpened;
    assert.isTrue(wasMenubarToggled);    
  });

  it('can set password', async () => {

    // Set password
    await app.client.element(settingsPage.settingCategoryWithText('Privacy')).click();

    const setPasswordBtn = settingsPage.settingButtonWithText('Set Password');
    await app.client.waitForExist(setPasswordBtn, 500);
    await app.client.element(setPasswordBtn).click();

    await common.setValueWrapper(
      app,
      settingsPage.passwordSetModalInput(),
      testPassword
    );

    await common.setValueWrapper(
      app,
      settingsPage.passwordSetModalInput(true),
      testPassword
    );

    await app.client.element(commonPage.divRoleButtonWithText('OK')).click();
    await app.client.waitForExist(commonPage.toastWithText('Password set'), 2000);


  });

});
