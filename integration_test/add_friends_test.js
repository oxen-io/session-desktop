/* eslint-disable func-names  */
/* eslint-disable import/no-extraneous-dependencies */
const common = require('./common');
const { afterEach, beforeEach, describe, it } = require('mocha');
const ConversationPage = require('./page-objects/conversation.page');

describe('Add friends', function() {
  let app;
  let app2;
  this.timeout(60000);
  this.slow(15000);

  beforeEach(async () => {
    await common.killall();
    [app, app2] = await Promise.all([
      common.startAndAssureCleanedApp(),
      common.startAndAssureCleanedApp2(),
    ]);
    common.stubSnodeCalls(app);
    common.stubSnodeCalls(app2);
    const login1 = common.restoreFromMnemonic(
      app,
      common.TEST_MNEMONIC1,
      common.TEST_DISPLAY_NAME1
    );

    const login2 = common.restoreFromMnemonic(
      app2,
      common.TEST_MNEMONIC2,
      common.TEST_DISPLAY_NAME2
    );
    await Promise.all([login1, login2]);

    await common.timeout(2000);
  });

  afterEach(async () => {
    await common.stopApp(app);
    await common.stopApp(app2);
    await common.killall();
  });

  it('can add a friend by sessionID', async () => {
    const textMessage = common.generateSendMessageText();

    await app.client.element(ConversationPage.contactsButtonSection).click();
    await app.client.element(ConversationPage.addContactButton).click();
    await app.client
      .isExisting(ConversationPage.leftPaneOverlay)
      .should.eventually.be.equal(true);

    await app.client
      .element(ConversationPage.sessionIDInput)
      .setValue(common.TEST_PUBKEY2);
    await app.client
      .element(ConversationPage.sessionIDInput)
      .getValue()
      .should.eventually.equal(common.TEST_PUBKEY2);
    await app.client.element(ConversationPage.nextButton).click();
    await app.client.waitForExist(
      ConversationPage.sendFriendRequestTextarea,
      1000
    );

    // send a text message to that user (will be a friend request)
    await app.client
      .element(ConversationPage.sendFriendRequestTextarea)
      .setValue(textMessage);
    await app.client.keys('Enter');
    await app.client.waitForExist(
      ConversationPage.existingFriendRequestText(textMessage),
      1000
    );
    // assure friend request message has been sent
    await common.timeout(3000);
    await app.client
      .isExisting(ConversationPage.retrySendButton)
      .should.eventually.be.equal(false);
  });
});
