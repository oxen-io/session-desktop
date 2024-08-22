// eslint-disable-next-line import/no-unresolved
import {} from 'styled-components/cssprop';

import { Store } from '@reduxjs/toolkit';
import { Persistor } from 'redux-persist/es/types';

import { ConversationCollection } from './models/conversation';
import { PrimaryColorStateType, ThemeStateType } from './themes/constants/colors';
import {
  GetMessageArgs,
  I18nMethods,
  LocalizerDictionary,
  LocalizerToken,
  SetupI18nReturnType,
} from './types/Localizer';
import type { Locale } from './util/i18n';

export interface LibTextsecure {
  messaging: boolean;
}

/*
We declare window stuff here instead of global.d.ts because we are importing other declarations.
If you import anything in global.d.ts, the type system won't work correctly.
*/

declare global {
  interface Window {
    Events: any;
    Session: any;
    Whisper: any;
    clearLocalData: () => Promise<void>;
    clipboard: any;
    getSettingValue: (id: string, comparisonValue?: any) => any;
    setSettingValue: (id: string, value: any) => Promise<void>;

    /** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.getMessage } and {@link window.i18n } */
    /**
     * Retrieves a localized message string, substituting variables where necessary.
     *
     * @param token - The token identifying the message to retrieve.
     * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
     *
     * @returns The localized message string with substitutions applied.
     *
     * @example
     * // The string greeting is 'Hello, {name}!' in the current locale
     * window.i18n('greeting', { name: 'Alice' });
     * // => 'Hello, Alice!'
     *
     * // The string search is '{count, plural, one [{found_count} of # match] other [{found_count} of # matches]}' in the current locale
     * window.i18n('search', { count: 1, found_count: 1 });
     * // => '1 of 1 match'
     */
    i18n: (<T extends LocalizerToken, R extends LocalizerDictionary[T]>(
      ...[token, args]: GetMessageArgs<T>
    ) => R) & {
      /** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.getRawMessage } and {@link window.i18n.getRawMessage } */
      /**
       * Retrieves a localized message string, without substituting any variables. This resolves any plural forms using the given args
       * @param token - The token identifying the message to retrieve.
       * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
       *
       * @returns The localized message string with substitutions applied.
       *
       * NOTE: This is intended to be used to get the raw string then format it with {@link formatMessageWithArgs}
       *
       * @example
       * // The string greeting is 'Hello, {name}!' in the current locale
       * window.i18n.getRawMessage('greeting', { name: 'Alice' });
       * // => 'Hello, {name}!'
       *
       * // The string search is '{count, plural, one [{found_count} of # match] other [{found_count} of # matches]}' in the current locale
       * window.i18n.getRawMessage('search', { count: 1, found_count: 1 });
       * // => '{found_count} of {count} match'
       */
      getRawMessage: I18nMethods['getRawMessage'];

      /** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.formatMessageWithArgs } and {@link window.i18n.formatMessageWithArgs } */
      /**
       * Formats a localized message string with arguments and returns the formatted string.
       * @param rawMessage - The raw message string to format. After using @see {@link getRawMessage} to get the raw string.
       * @param args - An optional record of substitution variables and their replacement values. This
       * is required if the string has dynamic variables. This can be optional as a strings args may be defined in @see {@link LOCALE_DEFAULTS}
       *
       * @returns The formatted message string.
       *
       * @example
       * // The string greeting is 'Hello, {name}!' in the current locale
       * window.i18n.getRawMessage('greeting', { name: 'Alice' });
       * // => 'Hello, {name}!'
       * window.i18n.formatMessageWithArgs('greeting', { name: 'Alice' });
       * // => 'Hello, Alice!'
       *
       * // The string search is '{count, plural, one [{found_count} of # match] other [{found_count} of # matches]}' in the current locale
       * window.i18n.getRawMessage('search', { count: 1, found_count: 1 });
       * // => '{found_count} of {count} match'
       * window.i18n.formatMessageWithArgs('search', { count: 1, found_count: 1 });
       * // => '1 of 1 match'
       */
      formatMessageWithArgs: I18nMethods['formatMessageWithArgs'];

      /** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.stripped } and {@link window.i18n.stripped } */
      /**
       * Retrieves a localized message string, substituting variables where necessary. Then strips the message of any HTML and custom tags.
       *
       * @param token - The token identifying the message to retrieve.
       * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
       *
       * @returns The localized message string with substitutions applied. Any HTML and custom tags are removed.
       *
       * @example
       * // The string greeting is 'Hello, {name}! <b>Welcome!</b>' in the current locale
       * window.i18n.stripped('greeting', { name: 'Alice' });
       * // => 'Hello, Alice! Welcome!'
       */
      stripped: I18nMethods['stripped'];

      /** NOTE: Because of docstring limitations changes MUST be manually synced between {@link setupI18n.inEnglish } and {@link window.i18n.inEnglish } */
      /**
       * Retrieves a message string in the {@link en} locale, substituting variables where necessary.
       *
       * NOTE: This does not work for plural strings. This function should only be used for debug and
       * non-user-facing strings. Plural string support can be added splitting out the logic for
       * {@link setupI18n.formatMessageWithArgs} and creating a new getMessageFromDictionary, which
       * specifies takes a dictionary as an argument. This is left as an exercise for the reader.
       *
       * @param token - The token identifying the message to retrieve.
       * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
       */
      inEnglish: I18nMethods['inEnglish'];
    };
    log: any;
    sessionFeatureFlags: {
      useOnionRequests: boolean;
      useTestNet: boolean;
      useClosedGroupV3: boolean;
      integrationTestEnv: boolean;
      replaceLocalizedStringsWithKeys: boolean;
      debug: {
        debugLogging: boolean;
        debugLibsessionDumps: boolean;
        debugFileServerRequests: boolean;
        debugNonSnodeRequests: boolean;
        debugOnionRequests: boolean;
      };
    };
    onLogin: (pw: string) => Promise<void>;
    persistStore?: Persistor;
    restart: () => void;
    getSeedNodeList: () => Array<string> | undefined;
    setPassword: (newPassword: string | null, oldPassword: string | null) => Promise<string>;
    isOnline: boolean;
    toggleMediaPermissions: () => Promise<void>;
    toggleCallMediaPermissionsTo: (enabled: boolean) => Promise<void>;
    getCallMediaPermissions: () => boolean;
    toggleMenuBar: () => void;
    toggleSpellCheck: () => void;
    primaryColor: PrimaryColorStateType;
    theme: ThemeStateType;
    setTheme: (newTheme: string) => Promise<void>;
    userConfig: any;
    versionInfo: any;
    getConversations: () => ConversationCollection;
    readyForUpdates: () => void;
    drawAttention: () => void;
    MediaRecorder: any;

    platform: string;
    openFromNotification: (convoId: string) => void;
    getEnvironment: () => string;
    getNodeVersion: () => string;

    showWindow: () => void;
    setCallMediaPermissions: (val: boolean) => void;
    setMediaPermissions: (val: boolean) => void;
    askForMediaAccess: () => void;
    getMediaPermissions: () => boolean;
    nodeSetImmediate: any;
    globalOnlineStatus: boolean;

    getTitle: () => string;
    getAppInstance: () => string;
    getCommitHash: () => string | undefined;
    getVersion: () => string;
    getOSRelease: () => string;
    setAutoHideMenuBar: (val: boolean) => void;
    setMenuBarVisibility: (val: boolean) => void;
    contextMenuShown: boolean;
    inboxStore?: Store;
    openConversationWithMessages: (args: {
      conversationKey: string;
      messageId: string | null;
    }) => Promise<void>;
    LokiPushNotificationServer: any;
    getGlobalOnlineStatus: () => boolean;
    confirmationDialog: any;
    setStartInTray: (val: boolean) => Promise<void>;
    getStartInTray: () => Promise<boolean>;
    getOpengroupPruning: () => Promise<boolean>;
    setOpengroupPruning: (val: boolean) => Promise<void>;
    closeAbout: () => void;
    closeDebugLog: () => void;
    getAutoUpdateEnabled: () => boolean;
    setAutoUpdateEnabled: (enabled: boolean) => void;
    setZoomFactor: (newZoom: number) => void;
    updateZoomFactor: () => void;

    Signal: any;
  }
}
