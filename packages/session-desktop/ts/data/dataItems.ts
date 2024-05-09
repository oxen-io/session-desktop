import _ from 'lodash';
import { fromArrayBufferToBase64, fromBase64ToArrayBuffer } from '../session/utils/String';
import { StorageItem } from '../node/storage_item';

function keysToArrayBuffer(keys: any, data: any) {
  const updated = _.cloneDeep(data);

  for (let i = 0, max = keys.length; i < max; i += 1) {
    const key = keys[i];
    if (key === 'value.pubKey') {
      updated.value.pubKey = new Uint8Array(fromBase64ToArrayBuffer(data.value.pubKey));
    } else if (key === 'value.privKey') {
      updated.value.privKey = new Uint8Array(fromBase64ToArrayBuffer(data.value.privKey));
    }
  }

  return updated;
}

function keysFromArrayBuffer(keys: any, data: any) {
  const updated = _.cloneDeep(data);

  for (let i = 0, max = keys.length; i < max; i += 1) {
    const key = keys[i];
    if (key === 'value.pubKey') {
      updated.value.pubKey = fromArrayBufferToBase64(data.value.pubKey);
    } else if (key === 'value.privKey') {
      updated.value.privKey = fromArrayBufferToBase64(data.value.privKey);
    }
  }

  return updated;
}

const ITEM_KEYS: object = {
  identityKey: ['value.pubKey', 'value.privKey'],
  profileKey: ['value'],
};

/**
 * For anything related to the UI and redux, do not use `createOrUpdateItem` directly. Instead use window.Storage.put (from the utils folder).
 * `window.Storage.put` will update the settings redux slice if needed but createOrUpdateItem will not.
 */
export async function createOrUpdateItem(data: StorageItem): Promise<void> {
  const { id } = data;
  if (!id) {
    throw new Error('createOrUpdateItem: Provided data did not have a truthy id');
  }

  const keys = (ITEM_KEYS as any)[id];
  const updated = Array.isArray(keys) ? keysFromArrayBuffer(keys, data) : data;
  await window.Data.createOrUpdateItem(updated);
}

/**
 * Note: In the app, you should always call getItemById through Data.getItemById (from the data.ts file).
 * This is to ensure testing and stubbbing works as expected
 */
export async function getItemById(id: string): Promise<StorageItem | undefined> {
  const keys = (ITEM_KEYS as any)[id];
  const data = await window.Data.getItemById(id);

  return Array.isArray(keys) ? keysToArrayBuffer(keys, data) : data;
}
/**
 * Note: In the app, you should always call getAllItems through Data.getAllItems (from the data.ts file).
 * This is to ensure testing and stubbbing works as expected
 */
export async function getAllItems(): Promise<Array<StorageItem>> {
  const items = await window.Data.getAllItems();
  return _.map(items, item => {
    const { id } = item;
    const keys = (ITEM_KEYS as any)[id];
    return Array.isArray(keys) ? keysToArrayBuffer(keys, item) : item;
  });
}

/**
 * Note: In the app, you should always call removeItemById through Data.removeItemById (from the data.ts file).
 * This is to ensure testing and stubbbing works as expected
 */
export async function removeItemById(id: string): Promise<void> {
  await window.Data.removeItemById(id);
}

export const DataItems = {
  // items table logic
  createOrUpdateItem,
  getItemById,
  getAllItems,
  removeItemById,
};
