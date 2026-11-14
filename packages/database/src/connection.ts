import { DatabaseSync } from 'node:sqlite';
import { DatabaseError } from '@norescan/shared';
import path from 'node:path';
import fs from 'node:fs';

export interface DatabaseConnectionOptions {
  filename?: string; // ':memory:' or file path
  readOnly?: boolean;
}

export class NoReScanDatabase {
  public readonly db: DatabaseSync;
  public readonly filename: string;

  constructor(options: DatabaseConnectionOptions = {}) {
    this.filename = options.filename ?? ':memory:';

    if (this.filename !== ':memory:') {
      const dir = path.dirname(this.filename);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    try {
      this.db = new DatabaseSync(this.filename);

      // Configure SQLite performance and safety PRAGMAs
      if (this.filename !== ':memory:') {
        this.db.exec('PRAGMA journal_mode = WAL;');
        this.db.exec('PRAGMA synchronous = NORMAL;');
      }
      this.db.exec('PRAGMA foreign_keys = ON;');
      this.db.exec('PRAGMA busy_timeout = 5000;');
    } catch (err) {
      throw new DatabaseError(`Failed to initialize SQLite database at ${this.filename}`, err);
    }
  }

  public close(): void {
    try {
      this.db.close();
    } catch (err) {
      throw new DatabaseError(`Failed to close SQLite database at ${this.filename}`, err);
    }
  }

  /**
   * Executes a callback within a transaction.
   */
  public transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = fn();
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }
}

