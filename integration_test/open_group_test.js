
/* eslint-disable func-names  */
/* eslint-disable import/no-extraneous-dependencies */
const commonTest = require('./common');
const { after, before, describe, it } = require('mocha');
const ConversationPage = require('./page-objects/conversation.page');
const RegistrationPage = require('./page-objects/registration.page');


describe('Open groups', function () {
  let app;
  this.timeout(20000);

  before(async () => {
    app = await commonTest.startApp();
    await commonTest.timeout(2000);
    await app.client.waitForExist(RegistrationPage.registrationTabs, 4000);
    await commonTest.restoreFromMnemonic(app, commonTest.TEST_MNEMONIC, commonTest.TEST_DISPLAY_NAME);
    await commonTest.timeout(2000);

  });

  after(async () => {
    // eslint-disable-next-line prefer-destructuring
    const ipcRenderer = app.electron.ipcRenderer;
    ipcRenderer.send('delete-all-data');
    await commonTest.timeout(2000);
    await commonTest.stopApp(app);
    await commonTest.timeout(2000);
  });
  
  it('works with valid group url', async () => {
    await app.client.element(ConversationPage.globeButtonSection).click();
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    await app.client.element(ConversationPage.openGroupInputUrl).setValue(commonTest.VALID_GROUP_URL);
    await app.client.element(ConversationPage.openGroupInputUrl).getValue().should.eventually.equal(commonTest.VALID_GROUP_URL);
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    // validate session loader is shown
    await app.client.waitForExist(ConversationPage.sessionLoader, 1000);
    await app.client.waitForExist(ConversationPage.sessionToastJoinOpenGroupSuccess, 5000);

    // validate overlay is closed
    await app.client.isExisting(ConversationPage.leftPaneOverlay).should.eventually.be.equal(false);

    // validate open chat has been added
    await app.client.waitForExist(ConversationPage.rowOpenGroupConversationName(commonTest.VALID_GROUP_NAME), 4000);
    await commonTest.timeout(1000);
  });

  it('cannot join two times the same open group', async () => {
    await app.client.element(ConversationPage.globeButtonSection).click();
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    await app.client.element(ConversationPage.openGroupInputUrl).setValue(commonTest.VALID_GROUP_URL2);
    await app.client.element(ConversationPage.joinOpenGroupButton).click();
    // first add is a success
    await app.client.waitForExist(ConversationPage.rowOpenGroupConversationName(commonTest.VALID_GROUP_NAME2), 6000);

    // adding a second time the same open group
    await app.client.element(ConversationPage.globeButtonSection).click();
    await app.client.element(ConversationPage.joinOpenGroupButton).click();

    await app.client.element(ConversationPage.openGroupInputUrl).setValue(commonTest.VALID_GROUP_URL2);
    await app.client.element(ConversationPage.joinOpenGroupButton).click();
    // validate session loader is not shown
    await app.client.isExisting(ConversationPage.sessionLoader).should.eventually.be.equal(false);

    await app.client.waitForExist(ConversationPage.sessionToastJoinOpenGroupAlreadyExist, 1000);

    // validate overlay is still opened
    await app.client.isExisting(ConversationPage.leftPaneOverlay).should.eventually.be.equal(true);

    await commonTest.timeout(1000);
  });

  it('can send message to open group', async () => {
    // generate a message containing the current timestamp so we can find it in the list of messages
    const textMessage = commonTest.generateSendMessageText();
    // the test 'cannot join two times the same open group' must have been run before that one
    await app.client.element(ConversationPage.conversationButtonSection).click();
    
    await app.client.waitForExist(ConversationPage.rowOpenGroupConversationName(commonTest.VALID_GROUP_NAME2), 200);
    await app.client.element(ConversationPage.rowOpenGroupConversationName(commonTest.VALID_GROUP_NAME2)).click();
    await app.client.element(ConversationPage.sendMessageTextarea).setValue(textMessage);
    await app.client.element(ConversationPage.sendMessageTextarea).getValue().should.eventually.equal(textMessage);
    // allow some time to fetch some messages
    await commonTest.timeout(3000);

    // send the message
    await app.client.keys('Enter');
    await commonTest.timeout(5000);
    // validate that the message has been added to the message list view
    await app.client.waitForExist(ConversationPage.existingSendMessageText(textMessage), 3000);
    await commonTest.timeout(5000);
    // we should validate that the message has been added effectively sent 
    // (checking the check icon on the metadata part of the message?)
    
  });
});