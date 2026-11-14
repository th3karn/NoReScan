import fs from 'node:fs/promises';
import path from 'node:path';

export interface MigrationResult {
  migrated: boolean;
  backupPath?: string;
  message: string;
}

/**
 * Checks for legacy .repomind/ directory and migrates data to .norescan/
 * with automatic backup, preserving all file analyses, fingerprints,
 * dependencies, and decisions.
 */
export async function migrateLegacy(projectRoot: string): Promise<MigrationResult> {
  const repomindDir = path.join(projectRoot, '.repomind');
  const codeCacheDir = path.join(projectRoot, '.norescan');

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

  let codeCacheExists = false;
  try {
    const stat = await fs.stat(codeCacheDir);
    codeCacheExists = stat.isDirectory();
  } catch {
    codeCacheExists = false;
  }

  if (!codeCacheExists) {
    // Copy .repomind to .norescan
    await fs.cp(repomindDir, codeCacheDir, { recursive: true });

    // In .norescan, rename memory.db to norescan.db if needed
    const oldDb = path.join(codeCacheDir, 'memory.db');
    const newDb = path.join(codeCacheDir, 'norescan.db');
    try {
      await fs.stat(oldDb);
      await fs.rename(oldDb, newDb);
      // check WAL/shm
      try { await fs.rename(path.join(codeCacheDir, 'memory.db-wal'), path.join(codeCacheDir, 'norescan.db-wal')); } catch { }
      try { await fs.rename(path.join(codeCacheDir, 'memory.db-shm'), path.join(codeCacheDir, 'norescan.db-shm')); } catch { }
    } catch { }

    // Check .repomindignore -> .norescanignore
    const oldIgnore = path.join(projectRoot, '.repomindignore');
    const newIgnore = path.join(projectRoot, '.norescanignore');
    try {
      await fs.stat(oldIgnore);
      try {
        await fs.stat(newIgnore);
      } catch {
        // copy if newIgnore does not exist
        await fs.copyFile(oldIgnore, newIgnore);
      }
    } catch { }

    return {
      migrated: true,
      backupPath: backupDir,
      message: `Successfully migrated legacy .repomind workspace to .norescan. Backup saved at ${backupDir}`,
    };
  }

  // If .norescan already exists, ensure norescan.db is present
  const codeCacheDb = path.join(codeCacheDir, 'norescan.db');
  let hasDb = false;
  try {
    await fs.stat(codeCacheDb);
    hasDb = true;
  } catch { }

  if (!hasDb) {
    const oldDb = path.join(repomindDir, 'memory.db');
    try {
      await fs.copyFile(oldDb, codeCacheDb);
      return {
        migrated: true,
        backupPath: backupDir,
        message: `Restored legacy memory.db from .repomind to .norescan/norescan.db. Backup saved at ${backupDir}`,
      };
    } catch { }
  }

  return {
    migrated: false,
    backupPath: backupDir,
    message: `.norescan workspace already exists. Legacy backup preserved at ${backupDir}`,
  };
}

