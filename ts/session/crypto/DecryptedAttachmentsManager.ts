/**
 * This file handles attachments for us.
 * If the attachment filepath is an encrypted one. It will decrypt it, cache it, and return the blob url to it.
 * An interval is run from time to time to cleanup old blobs loaded and not needed anymore (based on last access timestamp).
 *
 *
 */

import * as fse from 'fs-extra';
import path from 'path';
import { DURATION } from '../constants';
import { makeObjectUrl, urlToBlob } from '../../types/attachments/VisualAttachment';
import {
  getAbsoluteAttachmentPath as msgGetAbsoluteAttachmentPath,
  getAttachmentPath,
} from '../../types/MessageAttachment';
import { decryptAttachmentBufferRenderer } from '../../util/local_attachments_encrypter';
import Queue from 'queue-promise';

const queue = new Queue({
  concurrent: 1,
  interval: 100,
});
type DecryptResolve = { requested: string; resolved: string };

export const urlToDecryptedBlobMap = new Map<
  string,
  { decrypted: string; lastAccessTimestamp: number; forceRetain: boolean }
>();
export const urlToDecryptingPromise = new Map<string, Promise<DecryptResolve>>();

export const cleanUpOldDecryptedMedias = () => {
  const currentTimestamp = Date.now();
  let countCleaned = 0;
  let countKept = 0;
  let keptAsAvatars = 0;

  window?.log?.info('Starting cleaning of medias blobs...');
  for (const iterator of urlToDecryptedBlobMap) {
    if (
      iterator[1].forceRetain &&
      iterator[1].lastAccessTimestamp < currentTimestamp - DURATION.DAYS * 7
    ) {
      // keep forceRetained items for at most 7 days
      keptAsAvatars++;
    } else if (iterator[1].lastAccessTimestamp < currentTimestamp - DURATION.HOURS * 1) {
      // if the last access is older than one hour, revoke the url and remove it.

      URL.revokeObjectURL(iterator[1].decrypted);
      urlToDecryptedBlobMap.delete(iterator[0]);
      countCleaned++;
    } else {
      countKept++;
    }
  }
  window?.log?.info(
    `Clean medias blobs: cleaned/kept/keptAsAvatars: ${countCleaned}:${countKept}:${keptAsAvatars}`
  );
};

export const getLocalAttachmentPath = () => {
  return getAttachmentPath();
};

export const getAbsoluteAttachmentPath = (url: string) => {
  return msgGetAbsoluteAttachmentPath(url);
};

export const readFileContent = async (url: string) => {
  return fse.readFile(url);
};

queue.on('reject', error => {
  window.log.warn('[decryptEncryptedUrl] failed with', error);
});

async function getPromiseToEnqueue(
  url: string,
  contentType: string,
  isAvatar: boolean,
  callback: (result: DecryptResolve) => void
) {
  const taskToRun = new Promise<DecryptResolve>(async resolve => {
    window.log.info('about to read and decrypt file :', url, path.isAbsolute(url));
    try {
      const absUrl = path.isAbsolute(url) ? url : getAbsoluteAttachmentPath(url);
      const encryptedFileContent = await readFileContent(absUrl);
      const decryptedContent = await decryptAttachmentBufferRenderer(encryptedFileContent.buffer);
      if (decryptedContent?.length) {
        const arrayBuffer = decryptedContent.buffer;
        const obj = makeObjectUrl(arrayBuffer, contentType);

        if (!urlToDecryptedBlobMap.has(url)) {
          urlToDecryptedBlobMap.set(url, {
            decrypted: obj,
            lastAccessTimestamp: Date.now(),
            forceRetain: isAvatar,
          });
        }
        urlToDecryptingPromise.delete(url);
        resolve({ requested: url, resolved: obj });
        callback({ requested: url, resolved: obj });

        return;
      }
      urlToDecryptingPromise.delete(url);
      // failed to decrypt, fallback to url image loading
      // it might be a media we received before the update encrypting attachments locally.
      resolve({ requested: url, resolved: url });
      callback({ requested: url, resolved: url });
      return;
    } catch (e) {
      urlToDecryptingPromise.delete(url);
      window.log.warn(e);
      resolve({ requested: url, resolved: '' });
      callback({ requested: url, resolved: url });
    }
  });
  return taskToRun;
}

export const getDecryptedMediaUrl = async (
  url: string,
  contentType: string,
  isAvatar: boolean
): Promise<DecryptResolve> => {
  if (!url) {
    return { requested: url, resolved: url };
  }
  if (url.startsWith('blob:')) {
    return { requested: url, resolved: url };
  }

  const isAbsolute = path.isAbsolute(url);

  if (
    (isAbsolute &&
      exports.getLocalAttachmentPath &&
      url.startsWith(exports.getLocalAttachmentPath())) ||
    fse.pathExistsSync(exports.getAbsoluteAttachmentPath(url))
  ) {
    // this is a file encoded by session on our current attachments path.
    // we consider the file is encrypted.
    // if it's not, the hook caller has to fallback to setting the img src as an url to the file instead and load it
    if (urlToDecryptedBlobMap.has(url)) {
      // refresh the last access timestamp so we keep the one being currently in use
      const existing = urlToDecryptedBlobMap.get(url);
      const existingObjUrl = existing?.decrypted as string;

      urlToDecryptedBlobMap.set(url, {
        decrypted: existingObjUrl,
        lastAccessTimestamp: Date.now(),
        forceRetain: existing?.forceRetain || false,
      });
      // typescript does not realize that the has above makes sure the get is not undefined

      return { requested: url, resolved: existingObjUrl };
    }

    if (urlToDecryptingPromise.has(url)) {
      return urlToDecryptingPromise.get(url) as Promise<DecryptResolve>;
    }
    const resolvedInQueue = new Promise<DecryptResolve>(resolve => {
      const callback = (result: DecryptResolve) => {
        resolve(result);
      };
      queue.enqueue(async () => getPromiseToEnqueue(url, contentType, isAvatar, callback));
    });
    // now, create a promise waiting for the one on the queue to resolve

    urlToDecryptingPromise.set(url, resolvedInQueue);

    return urlToDecryptingPromise.get(url) as Promise<DecryptResolve>;
  } else {
    // Not sure what we got here. Just return the file.

    return { requested: url, resolved: url };
  }
};

/**
 *
 * Returns the already decrypted URL or null
 */
export const getAlreadyDecryptedMediaUrl = (url: string): string | null => {
  if (!url) {
    return null;
  }
  if (url.startsWith('blob:')) {
    return url;
  } else if (exports.getLocalAttachmentPath() && url.startsWith(exports.getLocalAttachmentPath())) {
    if (urlToDecryptedBlobMap.has(url)) {
      const existing = urlToDecryptedBlobMap.get(url);

      const existingObjUrl = existing?.decrypted as string;
      urlToDecryptedBlobMap.set(url, {
        decrypted: existingObjUrl,
        lastAccessTimestamp: Date.now(),
        forceRetain: existing?.forceRetain || false,
      });
      return existingObjUrl;
    }
  }
  return null;
};

export const getDecryptedBlob = async (url: string, contentType: string): Promise<Blob> => {
  const decryptedUrl = await getDecryptedMediaUrl(url, contentType, false);
  return urlToBlob(decryptedUrl.resolved);
};

/**
 * This function should only be used for testing purpose
 */
export const resetDecryptedUrlForTesting = () => {
  urlToDecryptedBlobMap.clear();
  urlToDecryptingPromise.clear();
};
