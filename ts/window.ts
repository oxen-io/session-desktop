<<<<<<< HEAD
declare global {
  interface Window {
    seedNodeList: any;

    WebAPI: any;
    LokiSnodeAPI: any;
    SenderKeyAPI: any;
    LokiMessageAPI: any;
    StubMessageAPI: any;
    StubAppDotNetApi: any;
    LokiPublicChatAPI: any;
    LokiAppDotNetServerAPI: any;
    LokiFileServerAPI: any;
    LokiRssAPI: any;

    // TODO: Extend from global.d.ts
    storage: any;
  }
}

// window.WebAPI = initializeWebAPI();
// const LokiSnodeAPI = require('./js/modules/loki_snode_api');
// window.SenderKeyAPI = require('./js/modules/loki_sender_key_api');
// window.lokiSnodeAPI
// window.LokiMessageAPI = require('./js/modules/loki_message_api');
// window.StubMessageAPI = require('./integration_test/stubs/stub_message_api');
// window.StubAppDotNetApi = require('./integration_test/stubs/stub_app_dot_net_api');
// window.LokiPublicChatAPI = require('./js/modules/loki_public_chat_api');
// window.LokiAppDotNetServerAPI = require('./js/modules/loki_app_dot_net_api');
// window.LokiFileServerAPI = require('./js/modules/loki_file_server_api');
// window.LokiRssAPI = require('./js/modules/loki_rss_api');

export const storage = window.storage;

export const exporttts = {
  // APIs
  WebAPI: window.WebAPI,

  // Utilities
  Events: () => window.Events,
  Signal: () => window.Signal,
  Whisper: () => window.Whisper,
  ConversationController: () => window.ConversationController,
  passwordUtil: () => window.passwordUtil,

  // Values
  CONSTANTS: () => window.CONSTANTS,
  versionInfo: () => window.versionInfo,
  mnemonic: () => window.mnemonic,
  lokiFeatureFlags: () => window.lokiFeatureFlags,

  // Getters
  getAccountManager: () => window.getAccountManager,
  getConversations: () => window.getConversations,
  getFriendsFromContacts: () => window.getFriendsFromContacts,
  getSettingValue: () => window.getSettingValue,

  // Setters
  setPassword: () => window.setPassword,
  setSettingValue: () => window.setSettingValue,

  // UI Events
  pushToast: () => window.pushToast,
  confirmationDialog: () => window.confirmationDialog,

  showQRDialog: () => window.showQRDialog,
  showSeedDialog: () => window.showSeedDialog,
  showPasswordDialog: () => window.showPasswordDialog,
  showEditProfileDialog: () => window.showEditProfileDialog,

  toggleTheme: () => window.toggleTheme,
  toggleMenuBar: () => window.toggleMenuBar,
  toggleSpellCheck: () => window.toggleSpellCheck,
  toggleLinkPreview: () => window.toggleLinkPreview,
  toggleMediaPermissions: () => window.toggleMediaPermissions,

  // Actions
  clearLocalData: () => window.clearLocalData,
  deleteAccount: () => window.deleteAccount,
  resetDatabase: () => window.resetDatabase,
  attemptConnection: () => window.attemptConnection,
};
=======
import { LocalizerType } from './types/Util';

interface Window {
  seedNodeList: any;

  WebAPI: any;
  LokiSnodeAPI: any;
  SenderKeyAPI: any;
  LokiMessageAPI: any;
  StubMessageAPI: any;
  StubAppDotNetApi: any;
  LokiPublicChatAPI: any;
  LokiAppDotNetServerAPI: any;
  LokiFileServerAPI: any;
  LokiRssAPI: any;

  CONSTANTS: any;
  versionInfo: any;

  Events: any;
  Lodash: any;
  clearLocalData: any;
  getAccountManager: any;
  getConversations: any;
  getFriendsFromContacts: any;
  mnemonic: any;
  clipboard: any;
  attemptConnection: any;

  passwordUtil: any;
  userConfig: any;
  shortenPubkey: any;

  dcodeIO: any;
  libsignal: any;
  libloki: any;
  displayNameRegex: any;

  Signal: any;
  Whisper: any;
  ConversationController: any;

  onLogin: any;
  setPassword: any;
  textsecure: any;
  Session: any;
  log: any;
  i18n: LocalizerType;
  friends: any;
  generateID: any;
  storage: any;
  pushToast: any;

  confirmationDialog: any;
  showQRDialog: any;
  showSeedDialog: any;
  showPasswordDialog: any;
  showEditProfileDialog: any;

  deleteAccount: any;

  toggleTheme: any;
  toggleMenuBar: any;
  toggleSpellCheck: any;
  toggleLinkPreview: any;
  toggleMediaPermissions: any;

  getSettingValue: any;
  setSettingValue: any;
  lokiFeatureFlags: any;

  resetDatabase: any;
}

declare const window: Window;

// Utilities
export const WebAPI = window.WebAPI;
export const Events = window.Events;
export const Signal = window.Signal;
export const Whisper = window.Whisper;
export const ConversationController = window.ConversationController;
export const passwordUtil = window.passwordUtil;

// Values
export const CONSTANTS = window.CONSTANTS;
export const versionInfo = window.versionInfo;
export const mnemonic = window.mnemonic;
export const lokiFeatureFlags = window.lokiFeatureFlags;

// Getters
export const getAccountManager = window.getAccountManager;
export const getConversations = window.getConversations;
export const getFriendsFromContacts = window.getFriendsFromContacts;
export const getSettingValue = window.getSettingValue;

// Setters
export const setPassword = window.setPassword;
export const setSettingValue = window.setSettingValue;

// UI Events
export const pushToast = window.pushToast;
export const confirmationDialog = window.confirmationDialog;

export const showQRDialog = window.showQRDialog;
export const showSeedDialog = window.showSeedDialog;
export const showPasswordDialog = window.showPasswordDialog;
export const showEditProfileDialog = window.showEditProfileDialog;

export const toggleTheme = window.toggleTheme;
export const toggleMenuBar = window.toggleMenuBar;
export const toggleSpellCheck = window.toggleSpellCheck;
export const toggleLinkPreview = window.toggleLinkPreview;
export const toggleMediaPermissions = window.toggleMediaPermissions;

// Actions
export const clearLocalData = window.clearLocalData;
export const deleteAccount = window.deleteAccount;
export const resetDatabase = window.resetDatabase;
export const attemptConnection = window.attemptConnection;
>>>>>>> 571169dcf31327f4c0ece0c78032c2688d85d5d0
