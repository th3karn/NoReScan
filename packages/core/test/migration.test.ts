import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { migrateLegacy, NoReScanCore } from '../src/index.js';
import { NoReScanDatabase, DatabaseMigrator } from '@norescan/database';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('Legacy Migration Subsystem (.repomind -> .norescan)', () => {
  let tempDir: string;
  let core: NoReScanCore | undefined;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'norescan-migration-test-'));
  });

  afterEach(async () => {
    if (core) {
      core.close();
      core = undefined;
    }
    // Give Windows a brief moment to release file handles
    await new Promise((resolve) => setTimeout(resolve, 50));
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('detects and migrates existing .repomind directory with backup', async () => {
    // 1. Setup mock legacy .repomind workspace
    const repomindDir = path.join(tempDir, '.repomind');
    await fs.mkdir(repomindDir, { recursive: true });

    const legacyUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const legacyConfig = {
      version: 1,
      projectId: legacyUuid,
      projectName: 'legacy-app',
      maxFileSizeKb: 2048,
      ignorePatterns: [],
      contextBudgetTokens: 8000,
      conservativeInvalidation: true,
      sync: { enabled: false },
    };
    await fs.writeFile(path.join(repomindDir, 'config.json'), JSON.stringify(legacyConfig, null, 2), 'utf8');

    // Create a real legacy SQLite database with migration v1
    const legacyDbPath = path.join(repomindDir, 'memory.db');
    const legacyDb = new NoReScanDatabase({ filename: legacyDbPath });
    const migrator = new DatabaseMigrator(legacyDb);
    migrator.migrate();
    legacyDb.close();

    await fs.writeFile(path.join(tempDir, '.repomindignore'), 'dist/\n*.tmp\n', 'utf8');

    // 2. Run migration
    const result = await migrateLegacy(tempDir);
    expect(result.migrated).toBe(true);
    expect(result.backupPath).toBeDefined();

    // 3. Verify backup exists
    const backupStat = await fs.stat(result.backupPath!);
    expect(backupStat.isDirectory()).toBe(true);

    // 4. Verify .norescan files exist
    const NoReScanDir = path.join(tempDir, '.norescan');
    const configStat = await fs.stat(path.join(NoReScanDir, 'config.json'));
    expect(configStat.isFile()).toBe(true);

    const dbStat = await fs.stat(path.join(NoReScanDir, 'norescan.db'));
    expect(dbStat.isFile()).toBe(true);

    const ignoreStat = await fs.stat(path.join(tempDir, '.norescanignore'));
    expect(ignoreStat.isFile()).toBe(true);

    // 5. Verify NoReScanCore automatically loads migrated config
    core = new NoReScanCore(tempDir);
    const loaded = await core.loadConfig();
    expect(loaded).toBeDefined();
    expect(loaded?.projectName).toBe('legacy-app');
    expect(loaded?.projectId).toBe(legacyUuid);
  });
});
