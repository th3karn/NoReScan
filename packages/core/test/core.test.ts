import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BugBrainCore } from '../src/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('BugBrainCore Integration Lifecycle', () => {
  let tempDir: string;
  let core: BugBrainCore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bugbrain-core-test-'));

    // Create a mock mini-codebase
    await fs.mkdir(path.join(tempDir, 'src', 'auth'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'auth', 'auth.service.ts'),
      'export class AuthService { login() { return true; } }'
    );
    await fs.writeFile(
      path.join(tempDir, 'src', 'auth', 'auth.controller.ts'),
      "import { AuthService } from './auth.service.js';\nexport class AuthController { constructor(private s: AuthService) {} }"
    );
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      '{"name": "demo-app", "version": "1.0.0"}'
    );

    core = new BugBrainCore(tempDir);
  });

  afterEach(async () => {
    core.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('initializes workspace, creates .bugbrain files, and registers project', async () => {
    const config = await core.init('demo-app');

    expect(config.projectName).toBe('demo-app');
    expect(config.projectId).toBeDefined();

    const configExists = await fs.stat(path.join(tempDir, '.bugbrain', 'config.json'));
    expect(configExists.isFile()).toBe(true);
    const dbExists = await fs.stat(path.join(tempDir, '.bugbrain', 'bugbrain.db'));
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

  it('computes diff, hot files, and blast radius accurately', async () => {
    await core.init('demo-app');
    await core.scan();

    const hotFiles = core.getHotFiles();
    expect(hotFiles.length).toBeGreaterThan(0);
    // auth.service.ts is imported by auth.controller.ts, so inDegree is at least 1
    const serviceHot = hotFiles.find((h) => h.relativePath === 'src/auth/auth.service.ts');
    expect(serviceHot?.inDegree).toBe(1);

    const blastRadius = core.getBlastRadius(['src/auth/auth.service.ts']);
    expect(blastRadius).toContain('src/auth/auth.controller.ts');

    const diff = await core.getDiff();
    expect(diff.unchanged).toBe(3);
    expect(diff.modified.length).toBe(0);
  });

  it('searches project memory and records decisions', async () => {
    await core.init('demo-app');
    await core.scan();

    const adr = core.recordDecision({
      title: 'Use JWT Tokens',
      decision: 'Implement stateless JWT authentication for API',
      rationale: 'Avoid database lookups on every request',
      affectedFiles: ['src/auth/auth.service.ts'],
    });
    expect(adr.id).toBeDefined();

    const searchResults = core.search('JWT');
    expect(searchResults.decisions.length).toBe(1);
    expect(searchResults.decisions[0].title).toBe('Use JWT Tokens');

    const symbolSearch = core.search('AuthService');
    expect(symbolSearch.symbols.length).toBeGreaterThan(0);
  });

  it('exports and backs up database cleanly', async () => {
    await core.init('demo-app');
    await core.scan();

    const memoryDump = (await core.exportMemory()) as any;
    expect(memoryDump.files.length).toBe(3);
    expect(memoryDump.version).toBe(1);

    const backupFile = await core.backupDatabase();
    const backupStat = await fs.stat(backupFile);
    expect(backupStat.isFile()).toBe(true);
  });

  it('retrieves task context directly from stored memory', async () => {
    await core.init('demo-app');
    await core.scan();

    const manifest = core.contextEngine.getContext('Refactor auth service login logic');
    expect(manifest.files.map((f) => f.relativePath)).toContain('src/auth/auth.service.ts');

    const markdown = core.contextEngine.getContextMarkdown('Refactor auth service login logic');
    expect(markdown).toContain('BugBrain Context Manifest');
    expect(markdown).toContain('src/auth/auth.service.ts');
  });

  it('passes system doctor diagnostics', async () => {
    await core.init('demo-app');
    const doctorResult = core.doctor();

    expect(doctorResult.healthy).toBe(true);
    expect(doctorResult.checks.every((c) => c.passed)).toBe(true);
  });
});
