/* eslint-disable prefer-destructuring */
/* eslint-disable more/no-then */
/* eslint-disable func-names  */
/* eslint-disable import/no-extraneous-dependencies */
const common = require('./common');
const { afterEach, beforeEach, describe, it } = require('mocha');
const ConversationPage = require('./page-objects/conversation.page');
const RegistrationPage = require('./page-objects/registration.page');

describe('Link Device', function() {
  let app;
  let app2;
  this.timeout(60000);
  this.slow(15000);

  beforeEach(async () => {
    await common.killallElectron();
    await common.stopStubSnodeServer();

    const app1Props = {
      mnemonic: common.TEST_MNEMONIC1,
      displayName: common.TEST_DISPLAY_NAME1,
      stubSnode: true,
    };

    const app2Props = {
      stubSnode: true,
    };

    [app, app2] = await Promise.all([
      common.startAndStub(app1Props),
      common.startAndStub2(app2Props),
    ]);
  });

  afterEach(async () => {
    await common.killallElectron();
    await common.stopStubSnodeServer();
  });

  it('link two desktop devices', async () => {
    // start the pairing dialog for the first app
    await app.client.element(ConversationPage.settingsButtonSection).click();
    await app.client.element(ConversationPage.deviceSettingsRow).click();

    // // validate that the no paired device is shown
    await app.client.isVisible(ConversationPage.noPairedDeviceMessage);

    await app.client.element(ConversationPage.linkDeviceButton).click();

    // validate device pairing dialog is shown and has a qrcode
    await app.client.isVisible(ConversationPage.devicePairingDialog);
    await app.client.isVisible(ConversationPage.qrImageDiv);

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
    await app.client.element(ConversationPage.allowPairingButton).click();
    await app.client.element(ConversationPage.okButton).click();
    // validate device paired in settings list with correct secrets
    await app.client.waitForExist(
      ConversationPage.devicePairedDescription(secretWordsapp1),
      2000
    );
    await app.client.element(ConversationPage.unpairDeviceButton);

    // validate app2 (secondary device) is linked successfully
    await app2.client.waitForExist(
      RegistrationPage.conversationListContainer,
      4000
    );

    // validate primary pubkey of app2 is the same that in app1
    await app2.webContents
      .executeJavaScript("window.storage.get('primaryDevicePubKey')")
      .should.eventually.be.equal(common.TEST_PUBKEY1);
  });

  it('unlink two devices', async () => {
    await common.linkApp2ToApp(app, app2);
    await common.timeout(1000);
    await common.triggerUnlinkApp2FromApp(app, app2);
  });

  it('ling and unlink repeatedly two devices', async () => {
    // await common.linkApp2ToApp(app, app2);
    // await common.timeout(1000);
    // await common.triggerUnlinkApp2FromApp(app, app2);
    // await common.linkApp2ToApp(app, app2);
    // await common.timeout(1000);
    // await common.triggerUnlinkApp2FromApp(app, app2);
    // await common.linkApp2ToApp(app, app2);
    // await common.timeout(1000);
    // await common.triggerUnlinkApp2FromApp(app, app2);
    // await common.linkApp2ToApp(app, app2);
    // await common.timeout(1000);
    // await common.triggerUnlinkApp2FromApp(app, app2);
  });
});
