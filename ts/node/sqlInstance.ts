import * as BetterSqlite3 from 'better-sqlite3';
import { Kysely, SqliteDialect, sql } from 'kysely';
import { DB } from '../types/db';

let globalInstance: BetterSqlite3.Database | null = null;

export function assertGlobalInstance(): BetterSqlite3.Database {
  if (!globalInstance) {
    throw new Error('globalInstance is not initialized.');
  }
  return globalInstance;
}

export function isInstanceInitialized(): boolean {
  return !!globalInstance;
}

export function assertGlobalInstanceOrInstance(
  instance?: BetterSqlite3.Database | null
): BetterSqlite3.Database {
  // if none of them are initialized, throw
  if (!globalInstance && !instance) {
    throw new Error('neither globalInstance nor initialized is initialized.');
  }
  // otherwise, return which ever is true, priority to the global one
  return globalInstance || (instance as BetterSqlite3.Database);
}

export function initDbInstanceWith(instance: BetterSqlite3.Database) {
  if (globalInstance) {
    throw new Error('already init');
  }
  globalInstance = instance;
}

export function closeDbInstance() {
  if (!globalInstance) {
    return;
  }
  const dbRef = globalInstance;
  globalInstance = null;
  // SQLLite documentation suggests that we run `PRAGMA optimize` right before
  // closing the database connection.
  dbRef.pragma('optimize');
  dbRef.close();
}

// Kysely functions
let globalKyselyInstance: Kysely<DB> | null = null;

export function assertGlobalKyselyInstance(): Kysely<DB> {
  if (!globalKyselyInstance) {
    throw new Error('globalKyselyInstance is not initialized.');
  }
  return globalKyselyInstance;
}

export function isKyselyInstanceInitialized(): boolean {
  return !!globalKyselyInstance;
}

export function assertGlobalKyselyInstanceOrKyselyInstance(
  instance?: Kysely<DB> | null
): Kysely<DB> {
  // if none of them are initialized, throw
  if (!globalKyselyInstance && !instance) {
    throw new Error('neither globalKyselyInstance nor initialized is initialized.');
  }
  // otherwise, return which ever is true, priority to the global one
  return globalKyselyInstance || (instance as Kysely<DB>);
}

export function initDbInstanceWithKysely(instance: BetterSqlite3.Database) {
  if (globalInstance) {
    throw new Error('already init');
  }

  // intiate our typings
  const dialect = new SqliteDialect({
    database: instance,
  });

  const kyselyInstance = new Kysely<DB>({
    dialect,
  });

  globalKyselyInstance = kyselyInstance;

  initDbInstanceWith(instance);
}

export async function closeDbInstanceWithKysely() {
  if (!globalKyselyInstance) {
    return;
  }
  const dbRef = globalKyselyInstance;
  globalKyselyInstance = null;
  // SQLLite documentation suggests that we run `PRAGMA optimize` right before
  // closing the database connection.
  await sql`PRAGMA optimize`.execute(dbRef);
  dbRef.destroy();
  closeDbInstance();
}
