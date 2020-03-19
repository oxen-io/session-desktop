/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-destructuring */

const { Application } = require('spectron');
const path = require('path');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const RegistrationPage = require('./page-objects/registration.page');
// const ConversationPage = require('./page-objects/conversation.page');
const { exec } = require('child_process');
const url = require('url');
const http = require('http');

chai.should();
chai.use(chaiAsPromised);

const STUB_SNODE_SERVER_PORT = 3000;

module.exports = {
  TEST_MNEMONIC1:
    'faxed mechanic mocked agony unrest loincloth pencil eccentric boyfriend oasis speedy ribbon faxed',
  TEST_PUBKEY1:
    '0552b85a43fb992f6bdb122a5a379505a0b99a16f0628ab8840249e2a60e12a413',
  TEST_DISPLAY_NAME1: 'integration_tester_1',

  TEST_MNEMONIC2:
    'guide inbound jerseys bays nouns basin sulking awkward stockpile ostrich ascend pylons ascend',
  TEST_PUBKEY2:
    '054e1ca8681082dbd9aad1cf6fc89a32254e15cba50c75b5a73ac10a0b96bcbd2a',
  TEST_DISPLAY_NAME2: 'integration_tester_2',

  VALID_GROUP_URL: 'https://chat.getsession.org',
  VALID_GROUP_URL2: 'https://chat-dev.lokinet.org',
  VALID_GROUP_NAME: 'Session Public Chat',
  VALID_GROUP_NAME2: 'Loki Dev Chat',

  async timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async startApp(env = 'test-integration-session') {
    // console.log('starting app with NODE_APP_INSTANCE', env)
    const app = new Application({
      path: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      args: ['.'],
      env: {
        NODE_APP_INSTANCE: env,
        NODE_ENV: 'production',
        LOKI_DEV: 1,
        USE_STUBBED_NETWORK: true,
        ELECTRON_ENABLE_LOGGING: true,
        ELECTRON_ENABLE_STACK_DUMPING: true,
        ELECTRON_DISABLE_SANDBOX: 1,
      },
      startTimeout: 10000,
      requireName: 'electronRequire',
      // chromeDriverLogPath: '../chromedriverlog.txt',
      chromeDriverArgs: [
        `remote-debugging-port=${Math.floor(
          Math.random() * (9999 - 9000) + 9000
        )}`,
      ],
    });

    chaiAsPromised.transferPromiseness = app.transferPromiseness;

    await app.start();
    await app.client.waitUntilWindowLoaded();

    return app;
  },

  async startApp2() {
    const app2 = await this.startApp('test-integration-session-2');
    return app2;
  },

  async stopApp(app) {
    if (app && app.isRunning()) {
      await app.stop();
      return Promise.resolve();
    }
    return Promise.resolve();
  },

  async killall() {
    return new Promise(resolve => {
      exec('killall -9 electron', (err, stdout, stderr) => {
        if (err) {
          resolve({ stdout, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  },

  async killStubSnodeServer() {
    return new Promise(resolve => {
      exec(
        `lsof -ti:${STUB_SNODE_SERVER_PORT} |xargs kill -9`,
        (err, stdout, stderr) => {
          if (err) {
            resolve({ stdout, stderr });
          } else {
            resolve({ stdout, stderr });
          }
        }
      );
    });
  },

  async rmFolder(folder) {
    return new Promise(resolve => {
      exec(`rm -r ${folder}`, (err, stdout, stderr) => {
        if (err) {
          resolve({ stdout, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  },

  async startAndAssureCleanedApp2() {
    const app2 = await this.startAndAssureCleanedApp(
      'test-integration-session-2'
    );
    return app2;
  },

  async startAndAssureCleanedApp(env = 'test-integration-session') {
    // FIXME make it dynamic and windows/macos compatible?
    if (env === 'test-integration-session') {
      await this.rmFolder('~/.config/Loki-Messenger-testIntegrationProfile');
    } else {
      await this.rmFolder('~/.config/Loki-Messenger-testIntegration2Profile');
    }
    const app = await this.startApp(env);
    await app.client.waitForExist(RegistrationPage.registrationTabSignIn, 4000);

    return app;
  },

  async restoreFromMnemonic(app, mnemonic, displayName) {
    await app.client.element(RegistrationPage.registrationTabSignIn).click();
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

  stubOpenGroupsCalls: app => {
    app.webContents.executeJavaScript(
      'window.LokiAppDotNetServerAPI = window.StubAppDotNetAPI;'
    );
  },

  stubSnodeCalls(app) {
    app.webContents.executeJavaScript(
      'window.LokiMessageAPI = window.StubMessageAPI;'
    );
  },

  async startStubSnodeServer() {
    if (!this.stubSnode) {
      await this.killStubSnodeServer();
      this.messages = {};
      this.stubSnode = http.createServer((request, response) => {
        const { query } = url.parse(request.url, true);
        const { pubkey, data, timestamp } = query;

        if (pubkey) {
          if (request.method === 'POST') {
            // console.warn('POST', [data, timestamp]);

            let ori = this.messages[pubkey];
            if (!this.messages[pubkey]) {
              ori = [];
            }

            this.messages[pubkey] = [...ori, { data, timestamp }];

            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end();
          } else {
            const retrievedMessages = { messages: this.messages[pubkey] };
            // console.warn('get', pubkey, retrievedMessages);

            if (this.messages[pubkey]) {
              response.writeHead(200, { 'Content-Type': 'application/json' });
              response.write(JSON.stringify(retrievedMessages));
            }
            response.end();
          }
        }
        response.end();
      });
      this.stubSnode.listen(STUB_SNODE_SERVER_PORT);
    } else {
      this.messages = {};
    }
  },
};
