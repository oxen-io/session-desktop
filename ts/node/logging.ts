// NOTE: Temporarily allow `then` until we convert the entire file to `async` / `await`:
/* eslint-disable more/no-then */

import path from 'path';
import fs from 'fs';

import { app, ipcMain as ipc } from 'electron';
import Logger from 'bunyan';
import _ from 'lodash';
import rimraf from 'rimraf';

import { readFile } from 'fs-extra';
import { redactAll } from '../util/privacy';

const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
let logger: Logger | undefined;

let loggerFilePath: string | undefined;

export type ConsoleCustom = typeof console & {
  _log: (...args: any) => void;
  _warn: (...args: any) => void;
  _error: (...args: any) => void;
};

export async function initializeLogger() {
  if (logger) {
    throw new Error('Already called initialize!');
  }

  const basePath = app.getPath('userData');
  const logFolder = path.join(basePath, 'logs');
  const logFile = path.join(logFolder, 'log.log');
  loggerFilePath = logFile;

  fs.mkdirSync(logFolder, { recursive: true });

  await cleanupLogs(logFile, logFolder);

  console.warn('[log] filepath', logFile);

  logger = Logger.createLogger({
    name: 'log',
    level: 'debug',
    streams: [
      {
        stream: process.stdout,
      },
      {
        path: logFile,
      },
    ],
  });

  logger.level('debug');
  // eslint-disable-next-line dot-notation
  (logger as any)['warn']('app start: logger created'); // keep this so we always have restart indications in the app

  LEVELS.forEach(level => {
    ipc.on(`log-${level}`, (_first, ...rest) => {
      (logger as any)[level](...rest);
    });
  });

  ipc.on('fetch-log', event => {
    if (!fs.existsSync(logFolder)) {
      fs.mkdirSync(logFolder, { recursive: true });
    }

    console.info('[log] fetching logs from', logFile);

    fetchLogFile(logFile).then(
      data => {
        event.sender.send('fetched-log', data);
      },
      error => {
        logger?.error(`[log] Problem loading log from disk: ${error.stack}`);
      }
    );
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  ipc.on('delete-all-logs', async event => {
    try {
      await deleteAllLogs(logFile);
    } catch (error) {
      logger?.error(`[log] Problem deleting all logs: ${error.stack}`);
    }

    event.sender.send('delete-all-logs-complete');
  });
}

export function getLoggerFilePath() {
  return loggerFilePath;
}

async function deleteAllLogs(logFile: string) {
  return new Promise((resolve, reject) => {
    rimraf(
      logFile,
      {
        disableGlob: true,
      },
      error => {
        if (error) {
          reject(error);
          return;
        }

        resolve(undefined);
      }
    );
  });
}

async function cleanupLogs(logFile: string, logFolder: string) {
  const now = new Date();
  const earliestDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2) // we keep 2 days worth of logs when we start the app and delete the rest
  );

  try {
    await eliminateOldEntries(logFile, earliestDate);
  } catch (error) {
    console.error(
      '[log] Error cleaning logs; deleting and starting over from scratch.',
      error.stack
    );
    fs.mkdirSync(logFolder, { recursive: true });
  }
}

async function eliminateOldEntries(logFile: string, date: Date) {
  const earliest = date.getTime();

  if (!fs.existsSync(logFile)) {
    return;
  }

  const lines = await fetchLog(logFile);

  const recent = _.filter(lines, line => new Date(line.time).getTime() >= earliest);
  const text = _.map(recent, line => JSON.stringify(line)).join('\n');

  fs.writeFileSync(logFile, `${text}\n`);
}

export function getLogger() {
  if (!logger) {
    throw new Error("Logger hasn't been initialized yet!");
  }

  return logger;
}

type LogEntry = { level: number; time: string; msg: string };

async function fetchLog(logFile: string): Promise<Array<LogEntry>> {
  const text = await readFile(logFile, { encoding: 'utf8' });

  const lines = _.compact(text.split('\n'));
  const data = _.compact(
    lines.map(line => {
      try {
        return _.pick(JSON.parse(line), ['level', 'time', 'msg']);
      } catch (e) {
        return null;
      }
    })
  );

  return data;
}

async function fetchLogFile(logFile: string) {
  // Check that the file exists locally
  if (!fs.existsSync(logFile)) {
    throw new Error('Log folder not found while fetching its content');
  }

  // creating a manual log entry for the final log result
  const now = new Date();
  const fileListEntry = {
    level: 30, // INFO
    time: now.toJSON(),
    msg: `Loaded this from logfile: "${logFile}"`,
  };

  const read = await fetchLog(logFile);
  const data = _.flatten(read);

  data.push(fileListEntry);

  return _.sortBy(data, 'time');
}

function logAtLevel(level: string, ...args: any) {
  if (logger) {
    // To avoid [Object object] in our log since console.log handles non-strings smoothly
    const str = args.map((item: any) => {
      if (typeof item !== 'string') {
        try {
          return JSON.stringify(item);
        } catch (e) {
          return item;
        }
      }

      return item;
    });
    (logger as any)[level](redactAll(str.join(' ')));
  } else {
    (console as ConsoleCustom)._log(...args);
  }
}

// This blows up using mocha --watch, so we ensure it is run just once
if (!(console as ConsoleCustom)._log) {
  (console as ConsoleCustom)._log = console.log;
  console.log = _.partial(logAtLevel, 'info');
  (console as ConsoleCustom)._error = console.error;
  console.error = _.partial(logAtLevel, 'error');
  (console as ConsoleCustom)._warn = console.warn;
  console.warn = _.partial(logAtLevel, 'warn');
}
