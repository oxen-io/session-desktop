/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-destructuring */

const { Application } = require('spectron');
const path = require('path');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const RegistrationPage = require('./page-objects/registration.page');
// const ConversationPage = require('./page-objects/conversation.page');

chai.should();
chai.use(chaiAsPromised);

module.exports = {
  TEST_MNEMONIC1:
    'onboard refer gumball nudged hope doctor saucepan wise karate sensible saga tutor doctor',
  TEST_PUBKEY1: '05a05b061b17f578999f39679fd56852db79e037f12057b7791950af3aea4b1f00',
  TEST_DISPLAY_NAME1: 'integration_tester_1',

  TEST_MNEMONIC2:
    'guide inbound jerseys bays nouns basin sulking awkward stockpile ostrich ascend pylons ascend',
  TEST_PUBKEY2: '054e1ca8681082dbd9aad1cf6fc89a32254e15cba50c75b5a73ac10a0b96bcbd2a',
  TEST_DISPLAY_NAME2: 'integration_tester_2',

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
      chromeDriverLogPath: '../chromedriverlog.txt',
      chromeDriverArgs: ['remote-debugging-port=9222'],
    });

    chaiAsPromised.transferPromiseness = app.transferPromiseness;
    await app.start();
    await app.client.waitUntilWindowLoaded();
    return app;
  },

  async stopApp(app) {
    if (app && app.isRunning()) {
      await app.stop();
      await this.timeout(2000);
      return Promise.resolve();
    }
    return Promise.resolve();

  },

  async startAndAssureCleanedApp() {
    let app = await this.startApp();
    await this.timeout(2000);

    const ipcRenderer = app.electron.ipcRenderer;
    ipcRenderer.send('delete-all-data');
    await this.timeout(2000);
    await this.stopApp(app);
    await this.timeout(2000);
    app = await this.startApp();
    await app.client.waitForExist(RegistrationPage.registrationTabs, 4000);
    
    return app;
  },

  async stopAndAssureCleanedApp(app) {
    const ipcRenderer = app.electron.ipcRenderer;
    ipcRenderer.send('delete-all-data');
    await app.client.waitForExist(RegistrationPage.registrationTabs, 2000);
    await this.stopApp(app);

    return null;
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
