const { Application } = require('spectron');
const path = require('path');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const RegistrationPage = require('./page-objects/registration.page');

chai.should();
chai.use(chaiAsPromised);

module.exports = {
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
        })
        
        chaiAsPromised.transferPromiseness = app.transferPromiseness;

        app.start();
        return app;
  },

    stopApp(app) {
        if (app && app.isRunning()) {
            app.stop()
                .catch(e => {
                    console.warn('error:', e);
            })

    }
    return Promise.resolve();
    },
    
    getEnvironment() {
        return 'test-integration-session';
  },
    
  async restoreFromMnemonic(app, mnemonic, displayName) {
    await app.client.element(RegistrationPage.registrationTabs).click();
    await app.client.element(RegistrationPage.restoreFromSeedMode).click();
    await app.client.element(RegistrationPage.recoveryPhraseInput).setValue(mnemonic);
    await app.client.element(RegistrationPage.displayNameInput).setValue(displayName);

    await app.client.element(RegistrationPage.continueSessionButton).click();
    await app.client.waitForExist(RegistrationPage.conversationListContainer, 4000);
  }

};