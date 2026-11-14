import fs from 'node:fs/promises';
import path from 'node:path';

export interface MigrationResult {
  migrated: boolean;
  backupPath?: string;
  message: string;
}

/**
 * Checks for legacy .repomind/ directory and migrates data to .bugbrain/
 * with automatic backup, preserving all file analyses, fingerprints,
 * dependencies, and decisions.
 */
export async function migrateLegacy(projectRoot: string): Promise<MigrationResult> {
  const repomindDir = path.join(projectRoot, '.repomind');
  const bugbrainDir = path.join(projectRoot, '.bugbrain');

  let repomindExists = false;
  try {
    const stat = await fs.stat(repomindDir);
    repomindExists = stat.isDirectory();
  } catch {
    repomindExists = false;
  }

  if (!repomindExists) {
    return {
      migrated: false,
      message: 'No legacy .repomind directory detected.',
    };
  }

  // Create timestamped backup of .repomind
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(projectRoot, `.repomind.backup-${timestamp}`);
  await fs.cp(repomindDir, backupDir, { recursive: true });

  let bugbrainExists = false;
  try {
    const stat = await fs.stat(bugbrainDir);
    bugbrainExists = stat.isDirectory();
  } catch {
    bugbrainExists = false;
  }

  if (!bugbrainExists) {
    // Copy .repomind to .bugbrain
    await fs.cp(repomindDir, bugbrainDir, { recursive: true });

    // In .bugbrain, rename memory.db to bugbrain.db if needed
    const oldDb = path.join(bugbrainDir, 'memory.db');
    const newDb = path.join(bugbrainDir, 'bugbrain.db');
    try {
      await fs.stat(oldDb);
      await fs.rename(oldDb, newDb);
      // check WAL/shm
      try { await fs.rename(path.join(bugbrainDir, 'memory.db-wal'), path.join(bugbrainDir, 'bugbrain.db-wal')); } catch {}
      try { await fs.rename(path.join(bugbrainDir, 'memory.db-shm'), path.join(bugbrainDir, 'bugbrain.db-shm')); } catch {}
    } catch {}

    // Check .repomindignore -> .bugbrainignore
    const oldIgnore = path.join(projectRoot, '.repomindignore');
    const newIgnore = path.join(projectRoot, '.bugbrainignore');
    try {
      await fs.stat(oldIgnore);
      try {
        await fs.stat(newIgnore);
      } catch {
        // copy if newIgnore does not exist
        await fs.copyFile(oldIgnore, newIgnore);
      }
    } catch {}

    return {
      migrated: true,
      backupPath: backupDir,
      message: `Successfully migrated legacy .repomind workspace to .bugbrain. Backup saved at ${backupDir}`,
    };
  }

  // If .bugbrain already exists, ensure bugbrain.db is present
  const bugbrainDb = path.join(bugbrainDir, 'bugbrain.db');
  let hasDb = false;
  try {
    await fs.stat(bugbrainDb);
    hasDb = true;
  } catch {}

  if (!hasDb) {
    const oldDb = path.join(repomindDir, 'memory.db');
    try {
      await fs.copyFile(oldDb, bugbrainDb);
      return {
        migrated: true,
        backupPath: backupDir,
        message: `Restored legacy memory.db from .repomind to .bugbrain/bugbrain.db. Backup saved at ${backupDir}`,
      };
    } catch {}
  }

  return {
    migrated: false,
    backupPath: backupDir,
    message: `.bugbrain workspace already exists. Legacy backup preserved at ${backupDir}`,
  };
}
