/* eslint-disable func-names  */
/* eslint-disable import/no-extraneous-dependencies */

const hooks = require('./common');
const { after, before, describe, it } = require('mocha');
const RegistrationPage = require('./page-objects/registration.page');

describe('Window Test and Login', function() {
  let app;
  this.timeout(20000);

  before(async () => {
    app = await hooks.startApp();
    await hooks.timeout(2000);
    await app.client.waitForExist(RegistrationPage.registrationTabs, 4000);
  });

  after(async () => {
    // eslint-disable-next-line prefer-destructuring
    const ipcRenderer = app.electron.ipcRenderer;
    ipcRenderer.send('delete-all-data');
    await hooks.timeout(2000);
    await hooks.stopApp(app);
    await hooks.timeout(2000);
  });

  it('opens one window', () => {
    app.client.getWindowCount().should.eventually.be.equal(1);
  });

  it('window title is correct', () => {
    app.client
      .getTitle()
      .should.eventually.be.equal(`Session - ${hooks.getEnvironment()}`);
  });

  it('can restore from seed', async () => {
    await app.client.element(RegistrationPage.registrationTabs).click();
    await app.client.element(RegistrationPage.restoreFromSeedMode).click();
    await app.client
      .element(RegistrationPage.recoveryPhraseInput)
      .setValue(hooks.TEST_MNEMONIC);
    await app.client
      .element(RegistrationPage.displayNameInput)
      .setValue(hooks.TEST_DISPLAY_NAME);

    // validate fields are filled
    await app.client
      .element(RegistrationPage.recoveryPhraseInput)
      .getValue()
      .should.eventually.equal(hooks.TEST_MNEMONIC);
    await app.client
      .element(RegistrationPage.displayNameInput)
      .getValue()
      .should.eventually.equal(hooks.TEST_DISPLAY_NAME);

    // trigger login
    await app.client.element(RegistrationPage.continueSessionButton).click();
    await app.client.waitForExist(
      RegistrationPage.conversationListContainer,
      4000
    );

    await hooks.timeout(2000);
  });
});
