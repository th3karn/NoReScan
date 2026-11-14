import fs from 'node:fs/promises';
import path from 'node:path';
import { hashFile } from './hasher.js';
import { normalizePath } from '@repomind/shared';

export interface FileFingerprint {
  relativePath: string;
  contentHash: string;
  fileSize: number;
  modifiedTime: number; // mtime timestamp in ms
  language: string;
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.php': 'php',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sql': 'sql',
  '.md': 'markdown',
  '.sh': 'shell',
  '.bash': 'shell',
  '.ps1': 'powershell',
};

/**
 * Infers language from file extension.
 */
export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] || 'unknown';
}

/**
 * Generates a complete cryptographic fingerprint for a file on disk.
 */
export async function computeFingerprint(
  absolutePath: string,
  relativePath: string
): Promise<FileFingerprint> {
  const stats = await fs.stat(absolutePath);
  const contentHash = await hashFile(absolutePath, true);

  return {
    relativePath: normalizePath(relativePath),
    contentHash,
    fileSize: stats.size,
    modifiedTime: stats.mtimeMs,
    language: detectLanguage(relativePath),
  };
}
