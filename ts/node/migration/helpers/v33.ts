import * as BetterSqlite3 from '@signalapp/better-sqlite3';
import { ConfigDumpRow, CONFIG_DUMP_TABLE } from '../../../types/sqlSharedTypes';
import { verify } from '../utils';

const targetVersion = 33;

function fetchConfigDumps(
  db: BetterSqlite3.Database,
  version: number,
  userPubkeyhex: string,
  variant: 'UserConfig' | 'ContactsConfig' | 'UserGroupsConfig' | 'ConvoInfoVolatileConfig'
): ConfigDumpRow | null {
  verify(version, targetVersion);

  const configWrapperDumps = db
    .prepare(
      `SELECT * FROM ${CONFIG_DUMP_TABLE} WHERE variant = $variant AND publicKey = $publicKey;`
    )
    .all({ variant, publicKey: userPubkeyhex }) as Array<ConfigDumpRow>;

  if (!configWrapperDumps || !configWrapperDumps.length) {
    return null;
  }

  // we can only have one dump with the current variants and our pubkey
  return configWrapperDumps[0];
}

function writeConfigDumps(
  db: BetterSqlite3.Database,
  version: number,
  userPubkeyhex: string,
  variant: 'UserConfig' | 'ContactsConfig' | 'UserGroupsConfig' | 'ConvoInfoVolatileConfig',
  dump: Uint8Array
) {
  verify(version, targetVersion);

  db.prepare(
    `INSERT OR REPLACE INTO ${CONFIG_DUMP_TABLE} (
            publicKey,
            variant,
            data
        ) values (
          $publicKey,
          $variant,
          $data
        );`
  ).run({
    publicKey: userPubkeyhex,
    variant,
    data: dump,
  });
}

export const V33 = {
  fetchConfigDumps,
  writeConfigDumps,
};
