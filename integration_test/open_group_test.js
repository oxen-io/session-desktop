
/* eslint-disable func-names  */
/* eslint-disable import/no-extraneous-dependencies */
const hooks = require('./common');
const { after, afterEach, before, beforeEach, describe, it } = require('mocha');
const ConversationPage = require('./page-objects/conversation.page');
const RegistrationPage = require('./page-objects/registration.page');


describe('Joining open groups', function () {
  let app;
  this.timeout(20000);

  before(async () => {
    app = await hooks.startApp();
    await hooks.timeout(2000);
    await app.client.waitForExist(RegistrationPage.registrationTabs, 4000);
    await hooks.restoreFromMnemonic(app, hooks.TEST_MNEMONIC, hooks.TEST_DISPLAY_NAME);
    await hooks.timeout(2000);

  });

  after(async () => {
    // eslint-disable-next-line prefer-destructuring
    const ipcRenderer = app.electron.ipcRenderer;
    ipcRenderer.send('delete-all-data');
    await hooks.timeout(2000);
    await hooks.stopApp(app);
    await hooks.timeout(2000);
  });
  
  it('works with valid group url', async () => {
    await app.client.element(ConversationPage.globeButtonSection).click();
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    await app.client.element(ConversationPage.openGroupInputUrl).setValue(hooks.VALID_GROUP_URL);
    await app.client.element(ConversationPage.openGroupInputUrl).getValue().should.eventually.equal(hooks.VALID_GROUP_URL);
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    // validate session loader is shown
    await app.client.waitForExist(ConversationPage.sessionLoader, 1000);
    await app.client.waitForExist(ConversationPage.sessionToastJoinOpenGroupSuccess, 5000);

    // validate overlay is closed
    await app.client.isExisting(ConversationPage.leftPaneOverlay).should.eventually.be.equal(false);

    // validate open chat has been added
    await app.client.waitForExist(ConversationPage.rowOpenGroupConversationName(hooks.VALID_GROUP_NAME), 4000);
    await hooks.timeout(1000);
  });

  it('cannot join two times the same open group', async () => {
    await app.client.element(ConversationPage.globeButtonSection).click();
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    await app.client.element(ConversationPage.openGroupInputUrl).setValue(hooks.VALID_GROUP_URL2);
    await app.client.element(ConversationPage.joinOpenGroupButton).click();
    // first add is a success
    await app.client.waitForExist(ConversationPage.rowOpenGroupConversationName(hooks.VALID_GROUP_NAME2), 6000);

    // adding a second time the same open group
    await app.client.element(ConversationPage.globeButtonSection).click();
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    await app.client.element(ConversationPage.openGroupInputUrl).setValue(hooks.VALID_GROUP_URL2);
    await app.client.element(ConversationPage.joinOpenGroupButton).click();
    // validate session loader is not shown
    await app.client.isExisting(ConversationPage.sessionLoader).should.eventually.be.equal(false);

    await app.client.waitForExist(ConversationPage.sessionToastJoinOpenGroupAlreadyExist, 1000);

    // validate overlay is still opened
    await app.client.isExisting(ConversationPage.leftPaneOverlay).should.eventually.be.equal(true);

    await hooks.timeout(1000);
  });
});