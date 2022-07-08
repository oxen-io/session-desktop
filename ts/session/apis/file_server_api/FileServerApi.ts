import AbortController from 'abort-controller';
import {
  getBinaryViaOnionV4FromFileServer,
  sendBinaryViaOnionV4ToFileServer,
  sendJsonViaOnionV4ToFileServer,
} from '../../onions/onionSend';
import { parseStatusCodeFromOnionRequestV4 } from '../open_group_api/opengroupV2/OpenGroupAPIV2Parser';
import {
  batchGlobalIsSuccess,
  parseBatchGlobalStatusCode,
} from '../open_group_api/sogsv3/sogsV3BatchPoll';

// tslint:disable-next-line: no-http-string
export const fileServerURL = 'http://filev2.getsession.org';
export const fileServerPubKey = 'da21e1d886c6fbaea313f75298bd64aab03a97ce985b46bb2dad9f2089c8ee59';
const RELEASE_VERSION_ENDPOINT = '/session_version?platform=desktop';

export type FileServerRequest = {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  endpoint: string;
  // queryParams are used for post or get, but not the same way
  queryParams?: Record<string, any>;
  headers?: Record<string, string | number>;
  useV4: boolean;
};

const POST_GET_FILE_ENDPOINT = '/file';

/**
 * Upload a file to the file server v2 using the onion v4 encoding
 * @param fileContent the data to send
 * @returns null or the fileID and complete URL to share this file
 */
export const uploadFileToFsWithOnionV4 = async (
  fileContent: ArrayBuffer
): Promise<{ fileId: number; fileUrl: string } | null> => {
  if (!fileContent || !fileContent.byteLength) {
    return null;
  }

  const result = await sendBinaryViaOnionV4ToFileServer({
    abortSignal: new AbortController().signal,
    bodyBinary: new Uint8Array(fileContent),
    endpoint: POST_GET_FILE_ENDPOINT,
    method: 'POST',
  });

  if (!batchGlobalIsSuccess(result)) {
    return null;
  }

  const fileId = result?.body?.id as number | undefined;
  if (!fileId) {
    return null;
  }
  const fileUrl = `${fileServerURL}${POST_GET_FILE_ENDPOINT}/${fileId}`;
  return {
    fileId: fileId,
    fileUrl,
  };
};

/**
 * Download a file given the fileId from the fileserver
 * @param fileIdOrCompleteUrl the fileId to download or the completeUrl to the fileitself
 * @returns the data as an Uint8Array or null
 */
export const downloadFileFromFileServer = async (
  fileIdOrCompleteUrl: string
): Promise<ArrayBuffer | null> => {
  let fileId = fileIdOrCompleteUrl;
  if (!fileIdOrCompleteUrl) {
    window?.log?.warn('Empty url to download for fileserver');
    return null;
  }

  const newCompleteUrlPrefix = `${fileServerURL}${POST_GET_FILE_ENDPOINT}/`;

  if (fileIdOrCompleteUrl.startsWith(newCompleteUrlPrefix)) {
    fileId = fileId.substring(newCompleteUrlPrefix.length);
  }

  if (fileId.startsWith('/')) {
    fileId = fileId.substring(1);
  }

  if (!fileId) {
    window.log.info('downloadFileFromFileServer given empty fileId');
    return null;
  }

  const result = await getBinaryViaOnionV4FromFileServer({
    abortSignal: new AbortController().signal,
    endpoint: `${POST_GET_FILE_ENDPOINT}/${fileId}`,
    method: 'GET',
  });

  if (!result) {
    return null;
  }

  if (!batchGlobalIsSuccess(result)) {
    window.log.info(
      'download from fileserver failed with status ',
      parseBatchGlobalStatusCode(result)
    );
    return null;
  }

  const { bodyBinary } = result;
  if (!bodyBinary || !bodyBinary.byteLength) {
    window.log.info('download from fileserver failed with status, empty content downloaded ');
    return null;
  }

  return bodyBinary.buffer;
};

/**
 * Fetch the latest desktop release available on github from the fileserver.
 * This call is onion routed and so do not expose our ip to github nor the file server.
 */
export const getLatestReleaseFromFileServer = async (): Promise<string | null> => {
  const result = await sendJsonViaOnionV4ToFileServer({
    abortSignal: new AbortController().signal,
    endpoint: RELEASE_VERSION_ENDPOINT,
    method: 'GET',
    stringifiedBody: null,
  });

  if (!batchGlobalIsSuccess(result) || parseStatusCodeFromOnionRequestV4(result) !== 200) {
    return null;
  }

  // we should probably change the logic of sendOnionRequest to not have all those levels
  const latestVersionWithV = (result?.body as any)?.result;
  if (!latestVersionWithV) {
    return null;
  }
  return latestVersionWithV;
};
