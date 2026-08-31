import { Global, Module, OnModuleInit, Optional } from '@nestjs/common';
import { InMemoryDbService } from './in-memory-db.service';
import { PostgresService } from './postgres/postgres.service';
import { getDataStore } from '../config/database.config';

/**
 * Both stores are available; DATA_STORE selects which one backs the app.
 *
 * The migration is incremental: PostgresService owns the connection, schema and
 * migrations, while the 176 existing data-access call sites still read through
 * InMemoryDbService. Moving those behind repositories is the next step, and
 * keeping both providers registered means it can happen table by table rather
 * than in one irreversible commit.
 *
 * With DATA_STORE=memory (the default) no connection is opened at all, so the
 * app still runs with no database configured.
 */
const postgresProviders =
  getDataStore() === 'postgres' ? [PostgresService] : [];

@Global()
@Module({
  providers: [InMemoryDbService, ...postgresProviders],
  exports: [InMemoryDbService, ...postgresProviders],
})
export class DatabaseModule implements OnModuleInit {
  constructor(@Optional() private readonly postgres?: PostgresService) {}

  async onModuleInit(): Promise<void> {
    // Schema is applied at startup so a fresh environment is usable immediately.
    // Each migration runs in its own transaction and is recorded, so this is a
    // no-op once the schema is current.
    if (this.postgres) {
      await this.postgres.runMigrations();
    }
  }
}
