import { join } from 'path';

/**
 * This always returns the app root path, either packaged or from the source code tree
 * If you move this file around, you will need to update those lines
 */
export function getAppRootPath() {
  const rootPath = join(__dirname, '..', '..','..');
  console.info('getAppRootPath:', rootPath)
  return rootPath
}
