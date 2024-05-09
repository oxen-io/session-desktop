import { isBoolean } from 'lodash';
import { deleteSettingsBoolValue, updateSettingsBoolValue } from '../state/ducks/settings'; // bad
import type { StorageType, ValueType } from '../types/storageType';
import { DataItems } from '../data/dataItems';

let ready = false;

type InsertedValueType = { id: string; value: ValueType };
let items: Record<string, InsertedValueType>;
let callbacks: Array<() => void> = [];

reset();

async function put(key: string, value: ValueType) {
  if (value === undefined) {
    throw new Error('Tried to store undefined');
  }
  if (!ready) {
    window.log.warn('Called storage.put before storage is ready. key:', key);
    throw new Error(`Called storage.put before storage is ready. key:"${key}"`);
  }

  const data: InsertedValueType = { id: key, value };
  items[key] = data;
  await DataItems.createOrUpdateItem(data);
  if (isBoolean(value)) {
    window?.inboxStore?.dispatch(updateSettingsBoolValue({ id: key, value }));
  }
}

function get(key: string, defaultValue?: ValueType) {
  if (!ready) {
    window.log.warn('Called storage.get before storage is ready. key:', key);
    throw new Error(`Called storage.get before storage is ready. key:"${key}"`);
  }

  const item = items[key];
  if (!item) {
    return defaultValue;
  }

  return item.value;
}

async function remove(key: string) {
  if (!ready) {
    window.log.warn('Called storage.get before storage is ready. key:', key);
    throw new Error(`Called storage.remove before storage is ready. key:"${key}"`);
  }

  delete items[key];

  window?.inboxStore?.dispatch(deleteSettingsBoolValue(key));

  await DataItems.removeItemById(key);
}

function onready(callback: () => void) {
  if (ready) {
    callback();
  } else {
    callbacks.push(callback);
  }
}

function callListeners() {
  if (ready) {
    callbacks.forEach(callback => {
      callback();
    });
    callbacks = [];
  }
}

async function fetch() {
  reset();

  const array = await DataItems.getAllItems();

  for (let i = 0, max = array.length; i < max; i += 1) {
    const item = array[i];
    const { id } = item;
    items[id] = item;
  }
  ready = true;
  callListeners();
}

function reset() {
  ready = false;
  items = Object.create(null);
}

export const Storage: StorageType = {
  fetch,
  put,
  get,
  remove,
  onready,
  reset,
};
