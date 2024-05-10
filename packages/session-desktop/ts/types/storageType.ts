import { SessionKeyPair } from '../receiver/keypairs';

export type StorageValueType = string | number | boolean | SessionKeyPair | Array<string>;

export type StorageType = {
  fetch: () => Promise<void>;
  put: (key: string, value: StorageValueType) => Promise<void>;
  get: (key: string, defaultValue?: StorageValueType) => any;
  remove: (key: string) => Promise<void>;
  onready: (callback: () => void) => void;
  reset: () => void;
};
