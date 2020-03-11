/* eslint-disable func-names  */
/* eslint-disable import/no-extraneous-dependencies */

const hooks = require('./hooks');
const { after, afterEach, before, beforeEach, describe, it } = require('mocha');
const RegistrationPage = require('./page-objects/registration.page');
const ConversationPage = require('./page-objects/conversation.page');

const TEST_MNEMONIC = 'onboard refer gumball nudged hope doctor saucepan wise karate sensible saga tutor doctor';
const TEST_DISPLAY_NAME = 'test1234';
const VALID_GROUP_URL = 'https://chat.getsession.org';
const VALID_GROUP_URL2 = 'https://chat-dev.lokinet.org';
const VALID_GROUP_NAME = 'Session Public Chat';
const VALID_GROUP_NAME2 = 'Loki Dev Chat';

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





describe('Joining open groups', function () {
  let app;
  this.timeout(20000);

  before(async () => {
    app = await hooks.startApp();
    await timeout(2000);
    await app.client.waitForExist(RegistrationPage.registrationTabs, 4000);
    await hooks.restoreFromMnemonic(app, TEST_MNEMONIC, TEST_DISPLAY_NAME);
    await timeout(2000);

  });

  after(async () => {
    // eslint-disable-next-line prefer-destructuring
    const ipcRenderer = app.electron.ipcRenderer;
    ipcRenderer.send('delete-all-data');
    await timeout(2000);
    await hooks.stopApp(app);
    await timeout(2000);
  });

  beforeEach(async () => {
    
  });
  
  afterEach(async() => {

  });
  
  it('works with valid group url', async () => {
    await app.client.element(ConversationPage.globeButtonSection).click();
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    await app.client.element(ConversationPage.openGroupInputUrl).setValue(VALID_GROUP_URL);
    await app.client.element(ConversationPage.openGroupInputUrl).getValue().should.eventually.equal(VALID_GROUP_URL);
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    // validate session loader is shown
    await app.client.waitForExist(ConversationPage.sessionLoader, 1000);
    await app.client.waitForExist(ConversationPage.sessionToastJoinOpenGroupSuccess, 5000);

    // validate overlay is closed
    await app.client.isExisting(ConversationPage.leftPaneOverlay).should.eventually.be.equal(false);

    // validate open chat has been added
    await app.client.waitForExist(ConversationPage.rowOpenGroupConversationName(VALID_GROUP_NAME), 4000);
    await timeout(1000);
  });

  it('cannot join two times the same open group', async () => {
    await app.client.element(ConversationPage.globeButtonSection).click();
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    await app.client.element(ConversationPage.openGroupInputUrl).setValue(VALID_GROUP_URL2);
    await app.client.element(ConversationPage.joinOpenGroupButton).click();
    // first add is a success
    await app.client.waitForExist(ConversationPage.rowOpenGroupConversationName(VALID_GROUP_NAME2), 6000);

    // adding a second time the same open group
    await app.client.element(ConversationPage.globeButtonSection).click();
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    await app.client.element(ConversationPage.openGroupInputUrl).setValue(VALID_GROUP_URL2);
    await app.client.element(ConversationPage.joinOpenGroupButton).click();
    // validate session loader is not shown
    await app.client.isExisting(ConversationPage.sessionLoader).should.eventually.be.equal(false);

    await app.client.waitForExist(ConversationPage.sessionToastJoinOpenGroupAlreadyExist, 1000);

    // validate overlay is still opened
    await app.client.isExisting(ConversationPage.leftPaneOverlay).should.eventually.be.equal(true);

    await timeout(1000);
  });
});