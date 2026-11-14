import fs from 'node:fs/promises';
import path from 'node:path';
import { IgnoreEngine } from './ignore.js';
import { computeFingerprint, FileFingerprint } from '@norescan/fingerprint';
import { assertPathContained, normalizePath, defaultLogger, NoReScanConfig } from '@norescan/shared';

export interface ScanOptions {
  projectRoot: string;
  config?: Partial<NoReScanConfig>;
  onProgress?: (scannedCount: number, currentPath: string) => void;
}

export interface ScanResult {
  fingerprints: Map<string, FileFingerprint>;
  stats: {
    totalFiles: number;
    ignoredFiles: number;
    skippedLargeFiles: number;
    skippedSymlinks: number;
    durationMs: number;
  };
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz', '.7z',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.pyc', '.wasm',
  '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.mov', '.avi'
]);

export class FileScanner {
  private projectRoot: string;
  private maxFileSizeBytes: number;
  private ignoreEngine: IgnoreEngine;

  constructor(options: ScanOptions) {
    this.projectRoot = normalizePath(path.resolve(options.projectRoot));
    const maxKb = options.config?.maxFileSizeKb ?? 2048;
    this.maxFileSizeBytes = maxKb * 1024;
    this.ignoreEngine = new IgnoreEngine(options.config?.ignorePatterns || []);
  }

  /**
   * Initializes ignore rules from .gitignore and .norescanignore (or legacy .repomindignore).
   */
  public async init(): Promise<void> {
    await this.ignoreEngine.loadIgnoreFile(path.join(this.projectRoot, '.gitignore'));
    await this.ignoreEngine.loadIgnoreFile(path.join(this.projectRoot, '.norescanignore'));
    await this.ignoreEngine.loadIgnoreFile(path.join(this.projectRoot, '.codecacheignore'));
    await this.ignoreEngine.loadIgnoreFile(path.join(this.projectRoot, '.code-cacheignore'));
    await this.ignoreEngine.loadIgnoreFile(path.join(this.projectRoot, '.bugbrainignore'));
    await this.ignoreEngine.loadIgnoreFile(path.join(this.projectRoot, '.repomindignore'));
  }

  /**
   * Performs recursive discovery and fingerprinting.
   */
  public async scan(onProgress?: (count: number, path: string) => void): Promise<ScanResult> {
    const startTime = Date.now();
    const fingerprints = new Map<string, FileFingerprint>();

    const stats = {
      totalFiles: 0,
      ignoredFiles: 0,
      skippedLargeFiles: 0,
      skippedSymlinks: 0,
      durationMs: 0,
    };

    await this.walkDirectory('', fingerprints, stats, onProgress);
    stats.totalFiles = fingerprints.size;
    stats.durationMs = Date.now() - startTime;

    return { fingerprints, stats };
  }

  private async walkDirectory(
    relativeDir: string,
    results: Map<string, FileFingerprint>,
    stats: { ignoredFiles: number; skippedLargeFiles: number; skippedSymlinks: number },
    onProgress?: (count: number, path: string) => void
  ): Promise<void> {
    const currentAbsoluteDir = path.join(this.projectRoot, relativeDir);
    let entries;
    try {
      entries = await fs.readdir(currentAbsoluteDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const relPath = normalizePath(relativeDir ? `${relativeDir}/${entry.name}` : entry.name);

      if (entry.isDirectory()) {
        if (this.ignoreEngine.ignores(relPath, true)) {
          stats.ignoredFiles++;
          continue;
        }
        await this.walkDirectory(relPath, results, stats, onProgress);
      } else if (entry.isSymbolicLink()) {
        try {
          const targetPath = await fs.realpath(path.join(this.projectRoot, relPath));
          // Check if symlink target is within projectRoot
          assertPathContained(targetPath, this.projectRoot);

          const stat = await fs.stat(targetPath);
          if (stat.isDirectory()) {
            if (!this.ignoreEngine.ignores(relPath, true)) {
              await this.walkDirectory(relPath, results, stats, onProgress);
            }
          } else if (stat.isFile()) {
            await this.processFile(relPath, stat.size, results, stats, onProgress);
          }
        } catch {
          // Symlink points outside root or is broken -> safe skip
          stats.skippedSymlinks++;
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) {
          stats.ignoredFiles++;
          continue;
        }

        if (this.ignoreEngine.ignores(relPath, false)) {
          stats.ignoredFiles++;
          continue;
        }

        try {
          const stat = await fs.stat(path.join(this.projectRoot, relPath));
          await this.processFile(relPath, stat.size, results, stats, onProgress);
        } catch {
          // File might have been removed concurrently
        }
      }
    }
  }

  private async processFile(
    relPath: string,
    fileSize: number,
    results: Map<string, FileFingerprint>,
    stats: { skippedLargeFiles: number },
    onProgress?: (count: number, path: string) => void
  ): Promise<void> {
    if (fileSize > this.maxFileSizeBytes) {
      stats.skippedLargeFiles++;
      return;
    }

    const absPath = path.join(this.projectRoot, relPath);
    try {
      const fp = await computeFingerprint(absPath, relPath);
      results.set(relPath, fp);
      if (onProgress) {
        onProgress(results.size, relPath);
      }
    } catch (err) {
      defaultLogger.warn(`Failed to fingerprint file: ${relPath}`, err);
    }
  }
}

