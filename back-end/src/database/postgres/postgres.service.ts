/**
 * postgres.service.ts — owns the connection pool and the migration runner.
 *
 * One pool per process, sized deliberately small: Aiven's free tier allows 20
 * connections total with no PgBouncer, and that budget is shared by every
 * developer and every deployed instance.
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { buildPoolConfig, describeConnection } from '../../config/database.config';
import { applyPgTypeParsers } from './pg-types';

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  constructor(
    @InjectPinoLogger(PostgresService.name) private readonly logger: PinoLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    // Must run before the pool exists — parsers are global to the pg module.
    applyPgTypeParsers();

    const config = buildPoolConfig();
    this.pool = new Pool(config);

    // An idle client erroring (server restart, network blip) would otherwise
    // surface as an unhandled rejection and take the process down.
    this.pool.on('error', (err) => {
      this.logger.error({ err }, 'Idle database client errored');
    });

    const target = describeConnection(String(config.connectionString));
    const started = Date.now();
    const { rows } = await this.pool.query<{ version: string }>('SELECT version()');
    this.logger.info(
      {
        target,
        poolMax: config.max,
        tls: Boolean(config.ssl),
        connectMs: Date.now() - started,
        server: rows[0]?.version?.split(',')[0],
      },
      'Connected to PostgreSQL',
    );
  }

  async onModuleDestroy(): Promise<void> {
    // Returning connections promptly matters on a 20-connection budget.
    await this.pool?.end();
  }

  /** Parameterised query. Never interpolate values into SQL — always use $1, $2, … */
  async query<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<T[]> {
    const started = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const durationMs = Date.now() - started;
      // Surfacing slow queries early is most of the value of having a real
      // database; the threshold is deliberately low for a dataset this small.
      if (durationMs > 200) {
        this.logger.warn({ durationMs, rows: result.rowCount, sql: text.slice(0, 200) }, 'Slow query');
      } else {
        this.logger.debug({ durationMs, rows: result.rowCount, sql: text.slice(0, 200) }, 'Query');
      }
      return result.rows;
    } catch (err) {
      // Log the statement but never the parameters: they carry credentials,
      // password hashes and personal data.
      this.logger.error({ err, sql: text.slice(0, 500) }, 'Query failed');
      throw err;
    }
  }

  /** Single row or null — the common lookup shape. */
  async queryOne<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows[0] ?? null;
  }

  /**
   * Run a set of statements atomically.
   *
   * This is the capability the JSON store could not offer: a leave approval that
   * writes attendance rows either lands completely or not at all, instead of
   * leaving half-applied state behind.
   */
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Apply any migration files not yet recorded, in filename order, each inside
   * its own transaction so a failure cannot leave a half-built schema.
   */
  async runMigrations(): Promise<void> {
    const dir = path.join(__dirname, '..', 'migrations');
    if (!fs.existsSync(dir)) {
      this.logger.warn({ dir }, 'No migrations directory found');
      return;
    }

    await this.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const applied = new Set(
      (await this.query<{ filename: string }>('SELECT filename FROM schema_migrations'))
        .map((r) => r.filename),
    );

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    let count = 0;

    for (const filename of files) {
      if (applied.has(filename)) continue;
      const sql = fs.readFileSync(path.join(dir, filename), 'utf8');

      await this.transaction(async (client) => {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      });

      this.logger.info({ filename }, 'Applied migration');
      count++;
    }

    this.logger.info(
      { applied: count, total: files.length },
      count ? 'Migrations applied' : 'Schema already up to date',
    );
  }

  /** Escape hatch for the seed script; application code should use query()/transaction(). */
  getPool(): Pool {
    return this.pool;
  }
}
