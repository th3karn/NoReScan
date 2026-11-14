import { describe, it, expect } from 'vitest';
import { diffFingerprints } from '../src/diff.js';
import { FileFingerprint } from '../src/fingerprint.js';
import { FileSnapshot } from '@norescan/shared';

describe('diffFingerprints', () => {
  it('correctly categorizes unchanged, modified, added, deleted, and renamed files', () => {
    const prev: Map<string, FileSnapshot> = new Map([
      [
        'src/unchanged.ts',
        {
          id: '1',
          projectId: 'p1',
          relativePath: 'src/unchanged.ts',
          contentHash: 'hash-aaa',
          language: 'typescript',
          fileSize: 100,
          status: 'valid',
          lastScannedAt: '2026-11-14T00:00:00Z',
        },
      ],
      [
        'src/modified.ts',
        {
          id: '2',
          projectId: 'p1',
          relativePath: 'src/modified.ts',
          contentHash: 'hash-bbb-old',
          language: 'typescript',
          fileSize: 200,
          status: 'valid',
          lastScannedAt: '2026-11-14T00:00:00Z',
        },
      ],
      [
        'src/deleted.ts',
        {
          id: '3',
          projectId: 'p1',
          relativePath: 'src/deleted.ts',
          contentHash: 'hash-ccc',
          language: 'typescript',
          fileSize: 300,
          status: 'valid',
          lastScannedAt: '2026-11-14T00:00:00Z',
        },
      ],
      [
        'src/old-name.ts',
        {
          id: '4',
          projectId: 'p1',
          relativePath: 'src/old-name.ts',
          contentHash: 'hash-rename-target',
          language: 'typescript',
          fileSize: 400,
          status: 'valid',
          lastScannedAt: '2026-11-14T00:00:00Z',
        },
      ],
    ]);

    const curr: Map<string, FileFingerprint> = new Map([
      [
        'src/unchanged.ts',
        {
          relativePath: 'src/unchanged.ts',
          contentHash: 'hash-aaa',
          fileSize: 100,
          modifiedTime: 1000,
          language: 'typescript',
        },
      ],
      [
        'src/modified.ts',
        {
          relativePath: 'src/modified.ts',
          contentHash: 'hash-bbb-new',
          fileSize: 220,
          modifiedTime: 1100,
          language: 'typescript',
        },
      ],
      [
        'src/new-file.ts',
        {
          relativePath: 'src/new-file.ts',
          contentHash: 'hash-ddd',
          fileSize: 150,
          modifiedTime: 1200,
          language: 'typescript',
        },
      ],
      [
        'src/new-name.ts',
        {
          relativePath: 'src/new-name.ts',
          contentHash: 'hash-rename-target',
          fileSize: 400,
          modifiedTime: 1300,
          language: 'typescript',
        },
      ],
    ]);

    const diff = diffFingerprints(curr, prev);

    expect(diff.unchanged.map((f) => f.relativePath)).toEqual(['src/unchanged.ts']);
    expect(diff.modified.map((f) => f.relativePath)).toEqual(['src/modified.ts']);
    expect(diff.added.map((f) => f.relativePath)).toEqual(['src/new-file.ts']);
    expect(diff.deleted.map((f) => f.relativePath)).toEqual(['src/deleted.ts']);
    expect(diff.renamed).toHaveLength(1);
    expect(diff.renamed[0].from.relativePath).toBe('src/old-name.ts');
    expect(diff.renamed[0].to.relativePath).toBe('src/new-name.ts');
  });
});

