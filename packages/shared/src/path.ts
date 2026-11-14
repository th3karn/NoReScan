import path from 'node:path';
import { SecurityViolationError } from './errors.js';

/**
 * Normalizes any filesystem path to use standard POSIX forward slashes.
 * Removes redundant slashes and trailing slashes (except root).
 */
export function normalizePath(filePath: string): string {
  if (!filePath) return '';
  // Normalize Windows drive letter and backslashes
  let normalized = filePath.replace(/\\/g, '/');
  // Collapse multiple consecutive slashes
  normalized = normalized.replace(/\/+/g, '/');
  // Strip trailing slash unless it's root
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * Ensures a target path is strictly contained within the project root directory.
 * Throws SecurityViolationError if path traversal or external escape is detected.
 */
export function assertPathContained(targetPath: string, rootPath: string): string {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedTarget = path.resolve(resolvedRoot, targetPath);

  const normalizedRoot = normalizePath(resolvedRoot);
  const normalizedTarget = normalizePath(resolvedTarget);

  if (!normalizedTarget.startsWith(normalizedRoot)) {
    throw new SecurityViolationError(
      `Path traversal violation: target "${targetPath}" resolves outside project root "${rootPath}".`,
      { targetPath, rootPath, resolvedTarget }
    );
  }

  return normalizedTarget;
}

/**
 * Computes a relative path from the project root, normalized with forward slashes.
 */
export function getRelativePath(absolutePath: string, rootPath: string): string {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedTarget = path.resolve(absolutePath);
  const rel = path.relative(resolvedRoot, resolvedTarget);
  return normalizePath(rel);
}

/**
 * Checks if a relative path matches common secret or credential patterns.
 */
export function isSensitivePath(relativePath: string): boolean {
  const normalized = normalizePath(relativePath).toLowerCase();
  const basename = path.posix.basename(normalized);

  // Exact matches
  const sensitiveBasenames = [
    '.env',
    'id_rsa',
    'id_ed25519',
    '.npmrc',
    '.pypirc',
    '.netrc',
  ];
  if (sensitiveBasenames.includes(basename)) return true;

  // Prefix matches (.env.*)
  if (basename.startsWith('.env.')) return true;

  // Extension matches (*.pem, *.key, etc.)
  const sensitiveExtensions = ['.pem', '.key', '.p12', '.pfx', '.pkcs12', '.jks'];
  for (const ext of sensitiveExtensions) {
    if (basename.endsWith(ext)) return true;
  }

  return false;
}

