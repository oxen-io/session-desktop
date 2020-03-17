/* eslint-disable prefer-destructuring */
/* eslint-disable more/no-then */
/* eslint-disable func-names  */
/* eslint-disable import/no-extraneous-dependencies */
const common = require('./common');
const { after, before, describe, it } = require('mocha');
const ConversationPage = require('./page-objects/conversation.page');
const RegistrationPage = require('./page-objects/registration.page');

describe('Link Device', function() {
  let app;
  let app2;
  this.timeout(600000);
  this.slow(15000);

  before(async () => {
    await common.killall();
    [app, app2] = await Promise.all([
      common.startAndAssureCleanedApp(),
      common.startAndAssureCleanedApp2(),
    ]);

    await common.timeout(2000);

    // login first app
    await common.restoreFromMnemonic(
      app,
      common.TEST_MNEMONIC1,
      common.TEST_DISPLAY_NAME1
    );
    await common.timeout(2000);
  });

  after(() => common.killall());

  it('link two desktop devices', async () => {
    // start the pairing dialog for the first app
    await app.client.element(ConversationPage.settingsButtonSection).click();
    await app.client.element(ConversationPage.deviceSettingsRow).click();

    // // validate that the no paired device is shown
    await app.client.waitForExist(ConversationPage.noPairedDeviceMessage, 300);

    await app.client.element(ConversationPage.linkDeviceButton).click();

    // validate device pairing dialog is shown and has a qrcode
    await app.client.waitForExist(ConversationPage.devicePairingDialog, 500);
    await app.client.waitForExist(ConversationPage.qrImageDiv, 100);

    // TODO we should validate that the displayed qrcode is the correct pubkey
    // next trigger the link request from the app2 with the app1 pubkey
    await app2.client.element(RegistrationPage.registrationTabSignIn).click();
    await app2.client.element(RegistrationPage.linkDeviceMode).click();
    await app2.client
      .element(RegistrationPage.textareaLinkDevicePubkey)
      .setValue(common.TEST_PUBKEY1);
    await app2.client
      .element(RegistrationPage.textareaLinkDevicePubkey)
      .getValue()
      .should.eventually.equal(common.TEST_PUBKEY1);
    await app2.client.element(RegistrationPage.linkDeviceTriggerButton).click();
    await app.client.waitForExist(RegistrationPage.toastWrapper, 7000);
    let secretWordsapp1 = await app.client
      .element(RegistrationPage.secretToastDescription)
      .getText();
    secretWordsapp1 = secretWordsapp1.split(': ')[1];

    await app2.client.waitForExist(RegistrationPage.toastWrapper, 6000);
    await app2.client
      .element(RegistrationPage.secretToastDescription)
      .getText()
      .should.eventually.be.equal(secretWordsapp1);

    await common.timeout(5000);
  });
});
