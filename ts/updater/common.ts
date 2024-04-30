import { BrowserWindow, dialog } from 'electron';

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

export async function showCannotUpdateDialog(mainWindow: BrowserWindow, messages: MessagesType) {
  const options = {
    type: 'error' as const,
    buttons: [messages.ok],
    title: messages.cannotUpdate,
    message: messages.cannotUpdateDetail,
  };
  await dialog.showMessageBox(mainWindow, options);
}

export function getPrintableError(error: Error) {
  return error && error.stack ? error.stack : error;
}
