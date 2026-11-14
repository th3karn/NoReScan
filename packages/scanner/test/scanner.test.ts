import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FileScanner } from '../src/scanner.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('FileScanner', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'norescan-scan-test-'));

    // Create test structure
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'node_modules', 'dep'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'dist'), { recursive: true });

    await fs.writeFile(path.join(tempDir, 'src', 'index.ts'), 'export const hello = "world";');
    await fs.writeFile(path.join(tempDir, 'src', 'utils.ts'), 'export function add(a, b) { return a + b; }');
    await fs.writeFile(path.join(tempDir, 'package.json'), '{"name": "test"}');
    await fs.writeFile(path.join(tempDir, '.env'), 'SECRET_KEY=12345');
    await fs.writeFile(path.join(tempDir, 'node_modules', 'dep', 'index.js'), 'module.exports = {};');
    await fs.writeFile(path.join(tempDir, 'dist', 'index.js'), 'console.log("built");');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('scans project files while excluding ignored, secret, and dependency files', async () => {
    const scanner = new FileScanner({ projectRoot: tempDir });
    await scanner.init();

    const result = await scanner.scan();

    const discoveredPaths = Array.from(result.fingerprints.keys()).sort();

    expect(discoveredPaths).toEqual(['package.json', 'src/index.ts', 'src/utils.ts']);
    expect(discoveredPaths).not.toContain('.env');
    expect(discoveredPaths).not.toContain('node_modules/dep/index.js');
    expect(discoveredPaths).not.toContain('dist/index.js');
    expect(result.stats.totalFiles).toBe(3);
  });
});

