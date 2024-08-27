import { BrowserWindow, dialog } from 'electron';
import type { SetupI18nReturnType } from '../types/Localizer';

export type MessagesType = {
  [key: string]: string;
};

type LogFunction = (...args: Array<any>) => void;

export type LoggerType = {
  fatal: LogFunction;
  error: LogFunction;
  warn: LogFunction;
  info: LogFunction;
  debug: LogFunction;
  trace: LogFunction;
};

export async function showDownloadUpdateDialog(
  mainWindow: BrowserWindow,
  i18n: SetupI18nReturnType
): Promise<boolean> {
  const DOWNLOAD_BUTTON = 0;
  const LATER_BUTTON = 1;
  const options = {
    type: 'info' as const,
    buttons: [i18n('download'), i18n('later')],
    title: i18n('updateSession'),
    message: i18n('updateNewVersionDescription'),
    detail: i18n('updateNewVersionDescription'),
    defaultId: LATER_BUTTON,
    cancelId: DOWNLOAD_BUTTON,
  };

  const ret = await dialog.showMessageBox(mainWindow, options);

  return ret.response === DOWNLOAD_BUTTON;
}

export async function showUpdateDialog(
  mainWindow: BrowserWindow,
  i18n: SetupI18nReturnType
): Promise<boolean> {
  const RESTART_BUTTON = 0;
  const LATER_BUTTON = 1;
  const options = {
    type: 'info' as const,
    buttons: [i18n('restart'), i18n('later')],
    title: i18n('updateSession'),
    message: i18n('updateDownloaded'),
    detail: i18n('updateDownloaded'),
    defaultId: LATER_BUTTON,
    cancelId: RESTART_BUTTON,
  };
  const ret = await dialog.showMessageBox(mainWindow, options);

  return ret.response === RESTART_BUTTON;
}

export async function showCannotUpdateDialog(mainWindow: BrowserWindow, i18n: SetupI18nReturnType) {
  const options = {
    type: 'error' as const,
    buttons: [i18n('okay')],
    title: i18n('updateError'),
    message: i18n('updateErrorDescription'),
  };
  await dialog.showMessageBox(mainWindow, options);
}

export function getPrintableError(error: Error) {
  return error && error.stack ? error.stack : error;
}
