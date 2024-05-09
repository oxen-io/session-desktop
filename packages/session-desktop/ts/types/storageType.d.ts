import { SessionKeyPair } from '../receiver/keypairs';

type ValueType = string | number | boolean | SessionKeyPair | Array<string>;

export type StorageType = {
  fetch: () => Promise<void>;
  put: (key: string, value: ValueType) => Promise<void>;
  get: (key: string, defaultValue?: ValueType) => any;
  remove: (key: string) => Promise<void>;
  onready: (callback: () => void) => void;
  reset: () => void;
};
