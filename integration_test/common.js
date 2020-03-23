/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-destructuring */

const { Application } = require('spectron');
const path = require('path');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const RegistrationPage = require('./page-objects/registration.page');
const ConversationPage = require('./page-objects/conversation.page');
const { exec } = require('child_process');
const url = require('url');
const http = require('http');

chai.should();
chai.use(chaiAsPromised);

const STUB_SNODE_SERVER_PORT = 3000;
const ENABLE_LOG = false;

module.exports = {
  /* **************  USERS  ****************** */
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

  /* **************  OPEN GROUPS  ****************** */
  VALID_GROUP_URL: 'https://chat.getsession.org',
  VALID_GROUP_URL2: 'https://chat-dev.lokinet.org',
  VALID_GROUP_NAME: 'Session Public Chat',
  VALID_GROUP_NAME2: 'Loki Dev Chat',

  /* **************  CLOSED GROUPS  ****************** */
  VALID_CLOSED_GROUP_NAME1: 'Closed Group 1',

  async timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async startApp(env = 'test-integration-session') {
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

  async killallElectron() {
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

  async startAndStub({
    mnemonic,
    displayName,
    stubSnode = false,
    stubOpenGroups = false,
    env = 'test-integration-session',
  }) {
    const app = await this.startAndAssureCleanedApp(env);

    if (stubSnode) {
      await this.startStubSnodeServer();
      this.stubSnodeCalls(app);
    }

    if (stubOpenGroups) {
      this.stubOpenGroupsCalls(app);
    }

    if (mnemonic && displayName) {
      await this.restoreFromMnemonic(app, mnemonic, displayName);
      await this.timeout(2000);
    }

    return app;
  },

  async startAndStub2(props) {
    const app2 = await this.startAndStub({
      env: 'test-integration-session-2',
      ...props,
    });

    return app2;
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

  async startAppsAsFriends() {
    const app1Props = {
      mnemonic: this.TEST_MNEMONIC1,
      displayName: this.TEST_DISPLAY_NAME1,
      stubSnode: true,
    };

    const app2Props = {
      mnemonic: this.TEST_MNEMONIC2,
      displayName: this.TEST_DISPLAY_NAME2,
      stubSnode: true,
    };

    const [app, app2] = await Promise.all([
      this.startAndStub(app1Props),
      this.startAndStub2(app2Props),
    ]);

    /** add each other as friends */
    const textMessage = this.generateSendMessageText();

    await app.client.element(ConversationPage.contactsButtonSection).click();
    await app.client.element(ConversationPage.addContactButton).click();

    await app.client
      .element(ConversationPage.sessionIDInput)
      .setValue(this.TEST_PUBKEY2);
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

    // wait for left notification Friend Request count to go to 1 and click it
    await app2.client.waitForExist(
      ConversationPage.oneNotificationFriendRequestLeft,
      5000
    );
    await app2.client
      .element(ConversationPage.oneNotificationFriendRequestLeft)
      .click();
    // open the dropdown from the top friend request count
    await app2.client.isExisting(
      ConversationPage.oneNotificationFriendRequestTop
    );
    await app2.client
      .element(ConversationPage.oneNotificationFriendRequestTop)
      .click();

    // accept the friend request and validate that on both side the "accepted FR" message is shown
    await app2.client
      .element(ConversationPage.acceptFriendRequestButton)
      .click();
    await app2.client.waitForExist(
      ConversationPage.acceptedFriendRequestMessage,
      1000
    );
    await app.client.waitForExist(
      ConversationPage.acceptedFriendRequestMessage,
      5000
    );

    return [app, app2];
  },

  async linkApp2ToApp(app, app2) {
    // app needs to be logged in as user1 and app2 needs to be logged out
    // start the pairing dialog for the first app
    await app.client.element(ConversationPage.settingsButtonSection).click();
    await app.client.element(ConversationPage.deviceSettingsRow).click();

    await app.client.isVisible(ConversationPage.noPairedDeviceMessage);

    await app.client.element(ConversationPage.linkDeviceButton).click();

    // validate device pairing dialog is shown and has a qrcode
    await app.client.isVisible(ConversationPage.devicePairingDialog);
    await app.client.isVisible(ConversationPage.qrImageDiv);

    // next trigger the link request from the app2 with the app1 pubkey
    await app2.client.element(RegistrationPage.registrationTabSignIn).click();
    await app2.client.element(RegistrationPage.linkDeviceMode).click();
    await app2.client
      .element(RegistrationPage.textareaLinkDevicePubkey)
      .setValue(this.TEST_PUBKEY1);
    await app2.client.element(RegistrationPage.linkDeviceTriggerButton).click();
    await app.client.waitForExist(RegistrationPage.toastWrapper, 7000);
    let secretWordsapp1 = await app.client
      .element(RegistrationPage.secretToastDescription)
      .getText();
    secretWordsapp1 = secretWordsapp1.split(': ')[1];

    await app2.client.waitForExist(RegistrationPage.toastWrapper, 6000);
    await app2.client
      .element(RegistrationPage.secretToastDescription)
      .getText()
      .should.eventually.be.equal(secretWordsapp1);
    await app.client.element(ConversationPage.allowPairingButton).click();
    await app.client.element(ConversationPage.okButton).click();
    // validate device paired in settings list with correct secrets
    await app.client.waitForExist(
      ConversationPage.devicePairedDescription(secretWordsapp1),
      2000
    );
    await app.client.element(ConversationPage.unpairDeviceButton);

    // validate app2 (secondary device) is linked successfully
    await app2.client.waitForExist(
      RegistrationPage.conversationListContainer,
      4000
    );

    // validate primary pubkey of app2 is the same that in app1
    await app2.webContents
      .executeJavaScript("window.storage.get('primaryDevicePubKey')")
      .should.eventually.be.equal(this.TEST_PUBKEY1);
  },

  async triggerUnlinkApp2FromApp(app, app2) {
    // check app2 is loggedin
    await app2.client.isExisting(RegistrationPage.conversationListContainer);

    await app.client.element(ConversationPage.settingsButtonSection).click();
    await app.client.element(ConversationPage.deviceSettingsRow).click();
    // click the unlink button
    await app.client.element(ConversationPage.unpairDeviceButton).click();
    await app.client.element(ConversationPage.validateUnpairDevice).click();
    // let time to app2 to catch the event and restart dropping its data
    await this.timeout(5000);

    // check that the app restarted
    // (did not find a better way than checking the app no longer being accessible)
    let isApp2Joinable = true;
    try {
      await app2.client.isExisting(RegistrationPage.registrationTabSignIn);
    } catch (err) {
      // if we get an error here, it means Spectron is lost.
      // this is a good thing because it means app2 restarted
      isApp2Joinable = false;
    }

    if (isApp2Joinable) {
      throw new Error(
        'app2 is still joinable so it did not restart, so it did not unlink correctly'
      );
    }
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

  logsContainsString: async (app, str) => {
    const logs = JSON.stringify(await app.client.getRenderProcessLogs());
    return logs.includes(str);
  },

  async startStubSnodeServer() {
    if (!this.stubSnode) {
      this.messages = {};
      this.stubSnode = http.createServer((request, response) => {
        const { query } = url.parse(request.url, true);
        const { pubkey, data, timestamp } = query;

        if (pubkey) {
          if (request.method === 'POST') {
            if (ENABLE_LOG) {
              console.warn('POST', [data, timestamp]);
            }

            let ori = this.messages[pubkey];
            if (!this.messages[pubkey]) {
              ori = [];
            }

            this.messages[pubkey] = [...ori, { data, timestamp }];

            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end();
          } else {
            const retrievedMessages = { messages: this.messages[pubkey] };
            if (ENABLE_LOG) {
              console.warn('GET', pubkey, retrievedMessages);
            }
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

  async stopStubSnodeServer() {
    if (this.stubSnode) {
      this.stubSnode.close();
      this.stubSnode = null;
    }
  },

  // async killStubSnodeServer() {
  //   return new Promise(resolve => {
  //     exec(
  //       `lsof -ti:${STUB_SNODE_SERVER_PORT} |xargs kill -9`,
  //       (err, stdout, stderr) => {
  //         if (err) {
  //           resolve({ stdout, stderr });
  //         } else {
  //           resolve({ stdout, stderr });
  //         }
  //       }
  //     );
  //   });
  // },
};
