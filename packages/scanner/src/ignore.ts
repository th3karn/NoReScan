import ignore, { Ignore } from 'ignore';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isSensitivePath, normalizePath } from '@norescan/shared';

export const HARDCODED_IGNORES = [
  '.git',
  '.git/**',
  'node_modules',
  'node_modules/**',
  'dist',
  'dist/**',
  'build',
  'build/**',
  '.turbo',
  '.turbo/**',
  '.norescan',
  '.norescan/**',
  '.code-cache',
  '.code-cache/**',
  '.codecache',
  '.codecache/**',
  '.bugbrain',
  '.bugbrain/**',
  '.repomind',
  '.repomind/**',
  '.cache',
  '.cache/**',
  'coverage',
  'coverage/**',
  '.pnpm-store',
  '.pnpm-store/**',
];

export class IgnoreEngine {
  private ig: Ignore;

  constructor(customPatterns: string[] = []) {
    // ignore() is default export
    this.ig = (ignore as unknown as () => Ignore)();
    this.ig.add(HARDCODED_IGNORES);
    if (customPatterns.length > 0) {
      this.ig.add(customPatterns);
    }
  }

  /**
   * Adds rules from a file if it exists.
   */
  public async loadIgnoreFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));
      if (lines.length > 0) {
        this.ig.add(lines);
      }
    } catch {
      // File does not exist or unreadable, ignore
    }
  }

  /**
   * Checks whether a relative path should be ignored.
   */
  public ignores(relativePath: string, isDirectory = false): boolean {
    const normalized = normalizePath(relativePath);
    if (!normalized || normalized === '.') return false;

    // Security check: always ignore sensitive files (credentials, keys, .env)
    if (isSensitivePath(normalized)) {
      return true;
    }

    const testPath = isDirectory ? `${normalized}/` : normalized;
    return this.ig.ignores(testPath);
  }
}

