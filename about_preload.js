/* eslint-disable @typescript-eslint/no-var-requires */
/* global window */

const { ipcRenderer } = require('electron');
const url = require('url');
const os = require('os');
const { setupI18n } = require('./ts/util/i18n/i18n');

const config = url.parse(window.location.toString(), true).query;
const { dictionary, locale } = ipcRenderer.sendSync('locale-data');

window.theme = config.theme;
window.i18n = setupI18n({
  locale,
  translationDictionary: dictionary,
});

window.getOSRelease = () =>
  `${os.type()} ${os.release()}, Node.js ${config.node_version} ${os.platform()} ${os.arch()}`;
window.getEnvironment = () => config.environment;
window.getVersion = () => config.version;
window.getCommitHash = () => config.commitHash;
window.getAppInstance = () => config.appInstance;

const { AboutView } = require('./ts/components/AboutView');

window.Signal = {
  Components: {
    AboutView,
  },
};

require('./ts/util/logging');
