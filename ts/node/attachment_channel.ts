import { ipcMain } from 'electron';
import fse from 'fs-extra';
import { glob } from 'glob';
import { isString, map } from 'lodash';
import path from 'path';
import rimraf from 'rimraf';

import { getAttachmentsPath } from '../shared/attachments/shared_attachments';
import { sqlNode } from './sql'; // checked - only node

let initialized = false;

const ERASE_ATTACHMENTS_KEY = 'erase-attachments';
const CLEANUP_ORPHANED_ATTACHMENTS_KEY = 'cleanup-orphaned-attachments';

//      ensureDirectory :: AbsolutePath -> IO Unit
const ensureDirectory = async (userDataPath: string) => {
  if (!isString(userDataPath)) {
    throw new TypeError("'userDataPath' must be a string");
  }
  await fse.ensureDir(getAttachmentsPath(userDataPath));
};

const getAllAttachments = async (userDataPath: string) => {
  const dir = getAttachmentsPath(userDataPath);
  const pattern = path.join(dir, '**', '*');

  const files = await glob(pattern, { nodir: true });
  return map(files, file => path.relative(dir, file));
};

async function cleanupOrphanedAttachments(userDataPath: string) {
  const allAttachments = await getAllAttachments(userDataPath);
  const orphanedAttachments = sqlNode.removeKnownAttachments(allAttachments);
  await sqlNode.deleteAll({
    userDataPath,
    attachments: orphanedAttachments,
  });
}

export async function initAttachmentsChannel({ userDataPath }: { userDataPath: string }) {
  if (initialized) {
    throw new Error('initialze: Already initialized!');
  }
  initialized = true;

  console.log('Ensure attachments directory exists');
  await ensureDirectory(userDataPath);

  const attachmentsDir = getAttachmentsPath(userDataPath);

  ipcMain.on(ERASE_ATTACHMENTS_KEY, event => {
    try {
      rimraf.sync(attachmentsDir);
      event.sender.send(`${ERASE_ATTACHMENTS_KEY}-done`);
    } catch (error) {
      const errorForDisplay = error && error.stack ? error.stack : error;
      console.log(`erase attachments error: ${errorForDisplay}`);
      event.sender.send(`${ERASE_ATTACHMENTS_KEY}-done`, error);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  ipcMain.on(CLEANUP_ORPHANED_ATTACHMENTS_KEY, async event => {
    try {
      await cleanupOrphanedAttachments(userDataPath);
      event.sender.send(`${CLEANUP_ORPHANED_ATTACHMENTS_KEY}-done`);
    } catch (error) {
      const errorForDisplay = error && error.stack ? error.stack : error;
      console.log(`cleanup orphaned attachments error: ${errorForDisplay}`);
      event.sender.send(`${CLEANUP_ORPHANED_ATTACHMENTS_KEY}-done`, error);
    }
  });
}
