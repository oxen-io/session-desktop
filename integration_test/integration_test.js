/* eslint-disable func-names  */
/* eslint-disable import/no-extraneous-dependencies */

const hooks = require('./hooks');
const { describe, beforeEach, afterEach, it } = require('mocha');
const RegistrationPage = require('./page-objects/registration.page');

const TEST_MNEMONIC = 'onboard refer gumball nudged hope doctor saucepan wise karate sensible saga tutor doctor';
const TEST_DISPLAY_NAME = 'test1234';

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


describe('Window Test and Login', function () {
  let app;
  this.timeout(20000);

  beforeEach(async () => {
    app = await hooks.startApp();
    await timeout(2000);
    await app.client.waitForExist(RegistrationPage.registrationTabs, 4000);  
  });
  
  afterEach(async() => {
    // eslint-disable-next-line prefer-destructuring
    const ipcRenderer = app.electron.ipcRenderer;
    ipcRenderer.send('delete-all-data');
    await timeout(2000);
    await hooks.stopApp(app);
    await timeout(2000);
  });
  
   it('opens one window', () => {
    app.client.getWindowCount().should.eventually.be.equal(1);
  });

  it('window title is correct', () => {
    app.client.getTitle().should.eventually.be.equal(`Session - ${hooks.getEnvironment()}`);
  }); 

  it('can restore from seed', async () => {
    await app.client.element(RegistrationPage.registrationTabs).click();
    await app.client.element(RegistrationPage.restoreFromSeedMode).click();
    await app.client.element(RegistrationPage.recoveryPhraseInput).setValue(TEST_MNEMONIC);
    await app.client.element(RegistrationPage.displayNameInput).setValue(TEST_DISPLAY_NAME);

    // validate fields are filled
    await app.client.element(RegistrationPage.recoveryPhraseInput).getValue().should.eventually.equal(TEST_MNEMONIC);
    await app.client.element(RegistrationPage.displayNameInput).getValue().should.eventually.equal(TEST_DISPLAY_NAME);

    // trigger login
    await app.client.element(RegistrationPage.continueSessionButton).click();
    await app.client.waitForExist(RegistrationPage.conversationListContainer, 4000);

    await timeout(2000);


  });

});
