import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { config, productionCheck } from './config';
export interface SQL {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
}
export interface Database extends SQL {
  transaction<T>(fn: (tx: SQL) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
declare global {
  var rigDb: Promise<Database> | undefined;
}
async function createDatabase(): Promise<Database> {
  productionCheck();
  let db: Database;
  if (config.DATABASE_URL) {
    const { Pool, types } = await import('pg');
    types.setTypeParser(20, Number);
    types.setTypeParser(1700, Number);
    const pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5000,
    });
    const wrap = (client: Pick<import('pg').PoolClient, 'query'>): SQL => ({
      async query<T>(sql: string, params: unknown[] = []) {
        return (await client.query(sql, params)).rows as T[];
      },
      async exec(sql) {
        await client.query(sql);
      },
    });
    db = {
      ...wrap(pool),
      async transaction(fn) {
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          const r = await fn(wrap(c));
          await c.query('COMMIT');
          return r;
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        } finally {
          c.release();
        }
      },
      async close() {
        await pool.end();
      },
    };
  } else {
    if (config.PGLITE_PATH !== ':memory:')
      await mkdir(path.dirname(path.resolve(config.PGLITE_PATH)), { recursive: true });
    const { PGlite } = await import('@electric-sql/pglite');
    const client = new PGlite(config.PGLITE_PATH === ':memory:' ? undefined : config.PGLITE_PATH);
    const wrap = (c: Pick<import('@electric-sql/pglite').PGlite, 'query' | 'exec'>): SQL => ({
      async query<T>(sql: string, params: unknown[] = []) {
        return (await c.query<T>(sql, params)).rows;
      },
      async exec(sql) {
        await c.exec(sql);
      },
    });
    db = {
      ...wrap(client),
      transaction: (fn) => client.transaction((tx) => fn(wrap(tx))),
      close: () => client.close(),
    };
  }
  await db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  await db.transaction(async (tx) => {
    if (config.DATABASE_URL) await tx.query('SELECT pg_advisory_xact_lock(748291)');
    for (const version of ['001_initial']) {
      if (
        !(await tx.query('SELECT version FROM schema_migrations WHERE version=$1', [version]))
          .length
      ) {
        await tx.exec(
          await readFile(path.join(process.cwd(), 'migrations', `${version}.sql`), 'utf8'),
        );
        await tx.query('INSERT INTO schema_migrations(version) VALUES($1)', [version]);
      }
    }
  });
  return db;
}
export function database() {
  return (globalThis.rigDb ??= createDatabase().catch((e) => {
    globalThis.rigDb = undefined;
    throw e;
  }));
}
export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return (await database()).query<T>(sql, params);
}
