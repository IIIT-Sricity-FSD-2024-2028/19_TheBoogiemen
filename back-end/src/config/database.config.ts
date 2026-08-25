/**
 * database.config.ts — PostgreSQL connection configuration.
 *
 * Follows the same fail-closed pattern as auth.config.ts: a misconfigured
 * deployment refuses to boot rather than silently falling back to something
 * insecure.
 *
 * Aiven's free tier caps `max_connections` at 20 and offers no PgBouncer, so
 * every connection is a real backend process. The pool size is therefore small
 * and explicit — the default of 10 per instance would exhaust the budget with
 * two instances and a migration run.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PoolConfig } from 'pg';

export type DataStore = 'memory' | 'postgres';

export class DatabaseConfigError extends Error {}

/** Which store backs the application. Defaults to the JSON file so nothing breaks mid-migration. */
export function getDataStore(env: NodeJS.ProcessEnv = process.env): DataStore {
  const raw = (env.DATA_STORE ?? 'memory').trim().toLowerCase();
  if (raw !== 'memory' && raw !== 'postgres') {
    throw new DatabaseConfigError(`DATA_STORE must be "memory" or "postgres" (got "${raw}")`);
  }
  return raw;
}

const isProduction = (env: NodeJS.ProcessEnv) =>
  (env.NODE_ENV ?? '').trim().toLowerCase() === 'production';

export function buildPoolConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  const connectionString = (env.DATABASE_URL ?? '').trim();

  if (!connectionString) {
    throw new DatabaseConfigError(
      'DATABASE_URL is not set but DATA_STORE=postgres.\n' +
      '  Set it in back-end/.env — see .env.example for the Aiven connection format.',
    );
  }

  // A local docker/dev instance has no CA and is not reachable from outside the
  // machine. Anything else must present a certificate we can verify.
  const isLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(connectionString);
  const caPath = (env.PGSSLROOTCERT ?? '').trim();

  let ssl: PoolConfig['ssl'];

  if (caPath) {
    const resolved = path.isAbsolute(caPath) ? caPath : path.join(process.cwd(), caPath);
    if (!fs.existsSync(resolved)) {
      throw new DatabaseConfigError(
        `PGSSLROOTCERT points at "${resolved}" but no such file exists.\n` +
        '  Download ca.pem from the Aiven service overview page.',
      );
    }
    ssl = { rejectUnauthorized: true, ca: fs.readFileSync(resolved, 'utf8') };
  } else if (isLocal) {
    ssl = undefined; // plain TCP to a local instance
  } else {
    // Refusing here rather than setting rejectUnauthorized:false, which is what
    // gets pasted when the certificate is inconvenient. That leaves the
    // connection encrypted but unauthenticated — an attacker who can intercept
    // the route can impersonate the database and harvest every credential the
    // app sends.
    throw new DatabaseConfigError(
      'A remote DATABASE_URL requires PGSSLROOTCERT pointing at the Aiven CA certificate.\n' +
      '  Download ca.pem from the service overview page and set PGSSLROOTCERT=./certs/ca.pem.\n' +
      '  Do not disable certificate verification to work around this.',
    );
  }

  const max = Number(env.DB_POOL_MAX ?? 5);
  if (!Number.isInteger(max) || max < 1 || max > 20) {
    throw new DatabaseConfigError('DB_POOL_MAX must be an integer between 1 and 20.');
  }
  if (isProduction(env) && !ssl) {
    throw new DatabaseConfigError('TLS is required in production. Set PGSSLROOTCERT.');
  }

  return {
    connectionString,
    ssl,
    max,
    idleTimeoutMillis: Number(env.DB_IDLE_TIMEOUT_MS ?? 10_000),
    connectionTimeoutMillis: Number(env.DB_CONNECT_TIMEOUT_MS ?? 5_000),
    // Identifies this app in pg_stat_activity, which matters when several
    // developers share one free-tier service.
    application_name: `barelypassing-${env.NODE_ENV ?? 'development'}`,
  };
}

/** Redacts the password so a connection target can be logged safely. */
export function describeConnection(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return `${url.protocol}//${url.username}@${url.host}${url.pathname}`;
  } catch {
    return '<unparseable DATABASE_URL>';
  }
}
