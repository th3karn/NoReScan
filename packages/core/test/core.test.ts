import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RepoMindCore } from '../src/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('RepoMindCore Integration Lifecycle', () => {
  let tempDir: string;
  let core: RepoMindCore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomind-core-test-'));

    // Create a real sample codebase
    await fs.mkdir(path.join(tempDir, 'src', 'auth'), { recursive: true });

    await fs.writeFile(
      path.join(tempDir, 'src', 'auth', 'auth.service.ts'),
      'export class AuthService { login() { return true; } }'
    );
    await fs.writeFile(
      path.join(tempDir, 'src', 'auth', 'auth.controller.ts'),
      `import { AuthService } from './auth.service.js';
export class AuthController {
  private s = new AuthService();
}`
    );
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      '{"name": "demo-app", "version": "1.0.0"}'
    );

    core = new RepoMindCore(tempDir);
  });

  afterEach(async () => {
    core.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('initializes workspace, creates .repomind files, and registers project', async () => {
    const config = await core.init('demo-app');

    expect(config.projectName).toBe('demo-app');
    expect(config.projectId).toBeDefined();

    const configExists = await fs.stat(path.join(tempDir, '.repomind', 'config.json'));
    expect(configExists.isFile()).toBe(true);
    const dbExists = await fs.stat(path.join(tempDir, '.repomind', 'memory.db'));
    expect(dbExists.isFile()).toBe(true);
  });

  it('scans codebase, caches analyses, and reuses unchanged files on subsequent scan', async () => {
    await core.init('demo-app');

    // Run 1: Initial Scan
    const scan1 = await core.scan();
    expect(scan1.scanned).toBe(3);
    expect(scan1.added).toBe(3);
    expect(scan1.unchanged).toBe(0);

    const status1 = core.getStatus();
    expect(status1.totalFiles).toBe(3);
    expect(status1.validAnalyses).toBe(3);

    // Run 2: Immediate subsequent scan without file edits -> 100% REUSED!
    const scan2 = await core.scan();
    expect(scan2.scanned).toBe(3);
    expect(scan2.unchanged).toBe(3);
    expect(scan2.modified).toBe(0);
    expect(scan2.added).toBe(0);
  });

  it('detects single file modification and applies conservative invalidation', async () => {
    await core.init('demo-app');
    await core.scan();

    // Modify auth.service.ts by adding a new export (public interface change)
    await fs.writeFile(
      path.join(tempDir, 'src', 'auth', 'auth.service.ts'),
      'export class AuthService { login() { return true; } }\nexport const AUTH_VERSION = 2;'
    );

    // Scan again
    const scan3 = await core.scan();
    expect(scan3.modified).toBe(1);
    expect(scan3.unchanged).toBe(2); // auth.controller.ts and package.json unchanged!
    expect(scan3.invalidatedDependents).toBe(1); // auth.controller.ts marked stale!

    const status3 = core.getStatus();
    expect(status3.staleAnalyses).toBe(1); // auth.controller.ts is stale
  });

  it('retrieves task context directly from stored memory', async () => {
    await core.init('demo-app');
    await core.scan();

    const manifest = core.contextEngine.getContext('Refactor auth service login logic');
    expect(manifest.files.map((f) => f.relativePath)).toContain('src/auth/auth.service.ts');

    const markdown = core.contextEngine.getContextMarkdown('Refactor auth service login logic');
    expect(markdown).toContain('RepoMind Context Manifest');
    expect(markdown).toContain('src/auth/auth.service.ts');
  });

  it('passes system doctor diagnostics', async () => {
    await core.init('demo-app');
    const doctorResult = core.doctor();

    expect(doctorResult.healthy).toBe(true);
    expect(doctorResult.checks.every((c) => c.passed)).toBe(true);
  });
});
