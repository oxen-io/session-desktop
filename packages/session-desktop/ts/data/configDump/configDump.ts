import { AsyncObjectWrapper, ConfigDumpDataNode, ConfigDumpRow } from '../../types/sqlSharedTypes';
// eslint-disable-next-line import/no-unresolved, import/extensions
import { ConfigWrapperObjectTypes } from '../../webworker/workers/browser/libsession_worker_functions';
import { cleanData } from '../dataUtils';

export const ConfigDumpData: AsyncObjectWrapper<ConfigDumpDataNode> = {
  getByVariantAndPubkey: (variant: ConfigWrapperObjectTypes, pubkey: string) => {
    return window.Data.getByVariantAndPubkey(variant, pubkey);
  },
  saveConfigDump: (dump: ConfigDumpRow) => {
    return window.Data.saveConfigDump(cleanData(dump));
  },
  getAllDumpsWithData: () => {
    return window.Data.getAllDumpsWithData();
  },
  getAllDumpsWithoutData: () => {
    return window.Data.getAllDumpsWithoutData();
  },
};
