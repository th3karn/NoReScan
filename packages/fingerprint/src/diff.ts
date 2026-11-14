import { FileSnapshot } from '@bugbrain/shared';
import { FileFingerprint } from './fingerprint.js';

export interface DiffResult {
  unchanged: FileFingerprint[];
  modified: FileFingerprint[];
  added: FileFingerprint[];
  deleted: FileSnapshot[];
  renamed: Array<{ from: FileSnapshot; to: FileFingerprint }>;
}

/**
 * Compares current discovered fingerprints against the previously indexed file snapshots.
 */
export function diffFingerprints(
  current: Map<string, FileFingerprint>,
  previous: Map<string, FileSnapshot>
): DiffResult {
  const unchanged: FileFingerprint[] = [];
  const modified: FileFingerprint[] = [];
  const added: FileFingerprint[] = [];
  const deleted: FileSnapshot[] = [];
  const renamed: Array<{ from: FileSnapshot; to: FileFingerprint }> = [];

  // Index previous files by contentHash to detect renames
  const previousByHash = new Map<string, FileSnapshot[]>();
  for (const prev of previous.values()) {
    if (prev.status === 'deleted') continue;
    const list = previousByHash.get(prev.contentHash) || [];
    list.push(prev);
    previousByHash.set(prev.contentHash, list);
  }

  const potentialAdded: FileFingerprint[] = [];

  // Check current files against previous
  for (const [path, curr] of current.entries()) {
    const prev = previous.get(path);
    if (!prev || prev.status === 'deleted') {
      potentialAdded.push(curr);
    } else if (prev.contentHash === curr.contentHash) {
      unchanged.push(curr);
    } else {
      modified.push(curr);
    }
  }

  // Check for deleted files
  const potentialDeleted: FileSnapshot[] = [];
  for (const [path, prev] of previous.entries()) {
    if (prev.status === 'deleted') continue;
    if (!current.has(path)) {
      potentialDeleted.push(prev);
    }
  }

  // Detect renames by matching hashes between potentialDeleted and potentialAdded
  const matchedDeleted = new Set<string>();
  const matchedAdded = new Set<string>();

  for (const del of potentialDeleted) {
    const matchingAdd = potentialAdded.find(
      (add) => add.contentHash === del.contentHash && !matchedAdded.has(add.relativePath)
    );
    if (matchingAdd) {
      renamed.push({ from: del, to: matchingAdd });
      matchedDeleted.add(del.relativePath);
      matchedAdded.add(matchingAdd.relativePath);
    }
  }

  for (const add of potentialAdded) {
    if (!matchedAdded.has(add.relativePath)) {
      added.push(add);
    }
  }

  for (const del of potentialDeleted) {
    if (!matchedDeleted.has(del.relativePath)) {
      deleted.push(del);
    }
  }

  return {
    unchanged,
    modified,
    added,
    deleted,
    renamed,
  };
}

