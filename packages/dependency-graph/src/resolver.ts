import path from 'node:path';
import { normalizePath } from '@code-cache/shared';

const RESOLUTION_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.js'];

/**
 * Resolves a relative import specifier to a known project relative path.
 * Returns null if the import is external (npm package) or unresolvable.
 */
export function resolveImportSpecifier(
  specifier: string,
  fromFilePath: string,
  allKnownPaths: Set<string>
): string | null {
  // If not a relative local import, it's external (e.g. 'express', 'node:crypto')
  if (!specifier.startsWith('.')) {
    return null;
  }

  const fromDir = path.posix.dirname(normalizePath(fromFilePath));
  let candidateBase = normalizePath(path.posix.join(fromDir, specifier));

  // Strip leading slash if any
  if (candidateBase.startsWith('/')) {
    candidateBase = candidateBase.slice(1);
  }

  // 1. Direct match (e.g. import './file.js' where file.js exists)
  if (allKnownPaths.has(candidateBase)) {
    return candidateBase;
  }

  // 2. If specifier has .js extension, test equivalent .ts / .tsx
  if (candidateBase.endsWith('.js')) {
    const tsCandidate = candidateBase.slice(0, -3) + '.ts';
    if (allKnownPaths.has(tsCandidate)) return tsCandidate;
    const tsxCandidate = candidateBase.slice(0, -3) + '.tsx';
    if (allKnownPaths.has(tsxCandidate)) return tsxCandidate;
  }

  // 3. Extension probing
  for (const ext of RESOLUTION_EXTENSIONS) {
    const candidateWithExt = candidateBase + ext;
    if (allKnownPaths.has(candidateWithExt)) {
      return candidateWithExt;
    }
  }

  return null;
}
