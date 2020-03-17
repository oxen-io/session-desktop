/* eslint-disable prefer-arrow-callback */
/* eslint-disable func-names  */
/* eslint-disable import/no-extraneous-dependencies */

const common = require('./common');
const { after, before, describe, it } = require('mocha');
const RegistrationPage = require('./page-objects/registration.page');

describe('Window Test and Login', function() {
  let app;
  this.timeout(20000);
  this.slow(15000);

  before(async () => {
    await common.killall();
    app = await common.startAndAssureCleanedApp();
  });

  after(async () => {
    await common.stopApp(app);
  });

  it('opens one window', () => {
    app.client.getWindowCount().should.eventually.be.equal(1);
  });

  it('window title is correct', () => {
    app.client
      .getTitle()
      .should.eventually.be.equal('Session - test-integration-session');
  });

  it('can restore from seed', async () => {
    await app.client.element(RegistrationPage.registrationTabSignIn).click();
    await app.client.element(RegistrationPage.restoreFromSeedMode).click();
    await app.client
      .element(RegistrationPage.recoveryPhraseInput)
      .setValue(common.TEST_MNEMONIC1);
    await app.client
      .element(RegistrationPage.displayNameInput)
      .setValue(common.TEST_DISPLAY_NAME1);

    // validate fields are filled
    await app.client
      .element(RegistrationPage.recoveryPhraseInput)
      .getValue()
      .should.eventually.equal(common.TEST_MNEMONIC1);
    await app.client
      .element(RegistrationPage.displayNameInput)
      .getValue()
      .should.eventually.equal(common.TEST_DISPLAY_NAME1);

    // trigger login
    await app.client.element(RegistrationPage.continueSessionButton).click();
    await app.client.waitForExist(
      RegistrationPage.conversationListContainer,
      4000
    );

    await common.timeout(2000);

    await app.webContents.executeJavaScript("window.storage.get('primaryDevicePubKey')").should.eventually.be.equal(common.TEST_PUBKEY1);
  });
});
