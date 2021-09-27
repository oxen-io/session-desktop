/* global window */

const { ipcRenderer } = require('electron');
const url = require('url');
const i18n = require('./js/modules/i18n');

const config = url.parse(window.location.toString(), true).query;
const { locale } = config;
const localeMessages = ipcRenderer.sendSync('locale-data');
window.libsession = require('./ts/session');

window.getVersion = () => config.version;

window.theme = config.theme;
window.i18n = i18n.setup(locale, localeMessages);

window.getNodeVersion = () => config.node_version;
window.getEnvironment = () => config.environment;

// got.js appears to need this to successfully submit debug logs to the cloud
window.nodeSetImmediate = setImmediate;
require('./js/logging');

window.closeVideoCall = () => ipcRenderer.send('close-video-call');
