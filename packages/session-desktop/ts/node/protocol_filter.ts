import path from 'path';
import fs from 'fs';
import { Protocol, ProtocolRequest } from 'electron';
import { getAppRootPath } from './getRootPath';

function eliminateAllAfterCharacter(str: string, character: string) {
  const index = str.indexOf(character);
  if (index < 0) {
    return str;
  }

  return str.slice(0, index);
}

function urlToPath(targetUrl: string, options: { isWindows?: boolean } = {}) {
  const { isWindows } = options;

  const decoded = decodeURIComponent(targetUrl);
  const withoutScheme = decoded.slice(isWindows ? 8 : 7);
  const withoutQuerystring = eliminateAllAfterCharacter(withoutScheme, '?');
  const withoutHash = eliminateAllAfterCharacter(withoutQuerystring, '#');

  return withoutHash;
}

function createFileHandler({
  userDataPath,
  installPath,
  isWindows,
}: {
  isWindows: boolean;
  installPath: string;
  userDataPath: string;
}) {
  return (request: ProtocolRequest, callback: any) => {
    const appRootPath = getAppRootPath();
    // normalize() is primarily useful here for switching / to \ on windows
    const target = path.normalize(urlToPath(request.url, { isWindows }));
    // here we attempt to follow symlinks to the ultimate final path, reflective of what
    //   we do in main.js on userDataPath and installPath

    const realPath = fs.existsSync(target) ? fs.realpathSync(target) : target;
    // finally we do case-insensitive checks on windows
    const properCasing = isWindows ? realPath.toLowerCase() : realPath;
    console.warn('realPath', realPath);

    if (!path.isAbsolute(realPath)) {
      console.log(`Warning: denying request to non-absolute path '${realPath}'`);
      return callback();
    }

    if (
      !properCasing.startsWith(isWindows ? userDataPath.toLowerCase() : userDataPath) &&
      !properCasing.startsWith(isWindows ? installPath.toLowerCase() : installPath) &&
      !properCasing.startsWith(isWindows ? appRootPath.toLowerCase() : appRootPath)
    ) {
      console.log(
        `Warning: denying request to path '${realPath}' (userDataPath: '${userDataPath}', installPath: '${installPath}')`
      );
      return callback();
    }

    return callback({
      path: realPath,
    });
  };
}

export function installFileHandler({
  protocol,
  userDataPath,
  installPath,
  isWindows,
}: {
  protocol: Protocol;
  userDataPath: string;
  installPath: string;
  isWindows: boolean;
}) {
  protocol.interceptFileProtocol(
    'file',
    createFileHandler({ userDataPath, installPath, isWindows })
  );
}

// Turn off browser URI scheme since we do all network requests via Node.js
function disabledHandler(_request: any, callback: any) {
  // this will throw a native ERR::NOT_IMPLEMENTED (just keeping the words here so we can find it when searching for it in the codebase)
  return callback();
}

export function installWebHandler({ protocol }: { protocol: Protocol }) {
  protocol.interceptFileProtocol('about', disabledHandler);
  protocol.interceptFileProtocol('content', disabledHandler);
  protocol.interceptFileProtocol('chrome', disabledHandler);
  protocol.interceptFileProtocol('cid', disabledHandler);
  protocol.interceptFileProtocol('data', disabledHandler);
  protocol.interceptFileProtocol('filesystem', disabledHandler);
  protocol.interceptFileProtocol('ftp', disabledHandler);
  protocol.interceptFileProtocol('gopher', disabledHandler);
  // We need those not disabled to ERR::NOT_IMPLEMENTED
  // protocol.interceptFileProtocol('http', disabledHandler);
  // protocol.interceptFileProtocol('https', disabledHandler);
  protocol.interceptFileProtocol('javascript', disabledHandler);
  protocol.interceptFileProtocol('mailto', disabledHandler);
  protocol.interceptFileProtocol('ws', disabledHandler);
  protocol.interceptFileProtocol('wss', disabledHandler);
}
