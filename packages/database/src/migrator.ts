import { RepoMindDatabase } from './connection.js';
import { INITIAL_MIGRATION_V1 } from './schema.js';
import { DatabaseError, defaultLogger } from '@repomind/shared';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_initial_schema',
    sql: INITIAL_MIGRATION_V1,
  },
];

export class DatabaseMigrator {
  private db: RepoMindDatabase;

  constructor(db: RepoMindDatabase) {
    this.db = db;
  }

  public migrate(): void {
    try {
      this.db.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
      `);

      const getApplied = this.db.db.prepare('SELECT version FROM schema_migrations ORDER BY version ASC;');
      const rows = getApplied.all() as Array<{ version: number }>;
      const appliedVersions = new Set(rows.map((r) => r.version));

      for (const migration of MIGRATIONS) {
        if (!appliedVersions.has(migration.version)) {
          defaultLogger.info(`Applying database migration v${migration.version}: ${migration.name}`);
          this.db.transaction(() => {
            this.db.db.exec(migration.sql);
            const record = this.db.db.prepare(
              'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);'
            );
            record.run(migration.version, migration.name, new Date().toISOString());
          });
        }
      }
    } catch (err) {
      throw new DatabaseError('Failed to execute database migrations', err);
    }
  }
}
