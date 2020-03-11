/* eslint-disable import/no-extraneous-dependencies */
const { Application } = require('spectron');
const path = require('path');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const RegistrationPage = require('./page-objects/registration.page');
// const ConversationPage = require('./page-objects/conversation.page');

chai.should();
chai.use(chaiAsPromised);

module.exports = {
  TEST_MNEMONIC:
    'onboard refer gumball nudged hope doctor saucepan wise karate sensible saga tutor doctor',
  TEST_DISPLAY_NAME: 'test1234',
  VALID_GROUP_URL: 'https://chat.getsession.org',
  VALID_GROUP_URL2: 'https://chat-dev.lokinet.org',
  VALID_GROUP_NAME: 'Session Public Chat',
  VALID_GROUP_NAME2: 'Loki Dev Chat',

  timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async startApp() {
    const environment = this.getEnvironment();

    const app = new Application({
      path: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      args: ['.'],
      env: {
        NODE_ENV: environment,
        ELECTRON_ENABLE_LOGGING: true,
        ELECTRON_ENABLE_STACK_DUMPING: true,
      },
      startTimeout: 5000,
      requireName: 'electronRequire',
      // chromeDriverLogPath: '../chromedriverlog.txt'
    });

    chaiAsPromised.transferPromiseness = app.transferPromiseness;

    app.start();
    return app;
  },

  stopApp(app) {
    if (app && app.isRunning()) {
      app.stop().catch(e => {
        // eslint-disable-next-line no-console
        console.warn('error:', e);
      });
    }
    return Promise.resolve();
  },

  getEnvironment() {
    return 'test-integration-session';
  },

  async restoreFromMnemonic(app, mnemonic, displayName) {
    await app.client.element(RegistrationPage.registrationTabs).click();
    await app.client.element(RegistrationPage.restoreFromSeedMode).click();
    await app.client
      .element(RegistrationPage.recoveryPhraseInput)
      .setValue(mnemonic);
    await app.client
      .element(RegistrationPage.displayNameInput)
      .setValue(displayName);

    await app.client.element(RegistrationPage.continueSessionButton).click();
    await app.client.waitForExist(
      RegistrationPage.conversationListContainer,
      4000
    );
  },

  generateSendMessageText: () =>
    `Test message from integration tests ${Date.now()}`,
};
