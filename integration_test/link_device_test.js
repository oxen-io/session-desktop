/* eslint-disable more/no-then */
/* eslint-disable func-names  */
/* eslint-disable import/no-extraneous-dependencies */
const common = require('./common');
const { after, before, describe, it } = require('mocha');
const ConversationPage = require('./page-objects/conversation.page');

describe('Link Device', function() {
  let app;
  let app2;
  this.timeout(60000);
  this.slow(15000);

  before(async () => {
    await common.killall();
    app = await common.startAndAssureCleanedApp();
    app2 = await common.startAndAssureCleanedApp2();

    await common.timeout(2000);

  });


  after(() => common.killall());

  it('link two desktop devices', async () => {
    // await app.client.element(ConversationPage.settingsButtonSection).click();
    await common.restoreFromMnemonic(
      app,
      common.TEST_MNEMONIC1,
      common.TEST_DISPLAY_NAME1
    );
    await common.restoreFromMnemonic(
      app2,
      common.TEST_MNEMONIC2,
      common.TEST_DISPLAY_NAME2
    );
    return common.timeout(5000);
  }); 
});
