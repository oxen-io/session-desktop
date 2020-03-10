const { Application } = require('spectron');
const path = require('path');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

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
    }

};