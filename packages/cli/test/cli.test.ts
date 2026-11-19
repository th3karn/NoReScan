import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createProgram } from '../src/cli.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('norescan CLI Commands', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'norescan-cli-test-'));

    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'index.ts'),
      'export function main() { return "hello"; }'
    );
    await fs.writeFile(path.join(tempDir, 'package.json'), '{"name": "test-cli-repo"}');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('runs init and creates configuration in json mode', async () => {
    const program = createProgram();
    const stdoutChunks: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = (chunk: any) => {
      stdoutChunks.push(chunk.toString());
      return true;
    };

    try {
      await program.parseAsync(['node', 'norescan', '--project', tempDir, '--json', 'init', 'my-test-proj']);
    } finally {
      process.stdout.write = origWrite;
    }

    const output = JSON.parse(stdoutChunks.join(''));
    expect(output.success).toBe(true);
    expect(output.command).toBe('init');
    expect(output.data.projectName).toBe('my-test-proj');
  });

  it('runs scan, status, diff, search, and doctor end-to-end', async () => {
    // 1. Init
    let program = createProgram();
    await program.parseAsync(['node', 'norescan', '--project', tempDir, '--quiet', 'init']);

    // 2. Scan
    program = createProgram();
    const scanChunks: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = (chunk: any) => {
      scanChunks.push(chunk.toString());
      return true;
    };

    try {
      await program.parseAsync(['node', 'norescan', '--project', tempDir, '--json', 'scan']);
    } finally {
      process.stdout.write = origWrite;
    }

    const scanOutput = JSON.parse(scanChunks.join(''));
    expect(scanOutput.success).toBe(true);
    expect(scanOutput.data.scanned).toBe(2);
    expect(scanOutput.data.added).toBe(2);

    // 3. Status
    program = createProgram();
    const statusChunks: string[] = [];
    process.stdout.write = (chunk: any) => {
      statusChunks.push(chunk.toString());
      return true;
    };

    try {
      await program.parseAsync(['node', 'norescan', '--project', tempDir, '--json', 'status']);
    } finally {
      process.stdout.write = origWrite;
    }

    const statusOutput = JSON.parse(statusChunks.join(''));
    expect(statusOutput.success).toBe(true);
    expect(statusOutput.data.totalFiles).toBe(2);
    expect(statusOutput.data.validAnalyses).toBe(2);

    // 4. Diff
    program = createProgram();
    const diffChunks: string[] = [];
    process.stdout.write = (chunk: any) => {
      diffChunks.push(chunk.toString());
      return true;
    };

    try {
      await program.parseAsync(['node', 'norescan', '--project', tempDir, '--json', 'diff']);
    } finally {
      process.stdout.write = origWrite;
    }

    const diffOutput = JSON.parse(diffChunks.join(''));
    expect(diffOutput.success).toBe(true);
    expect(diffOutput.data.unchanged).toBe(2);

    // 5. Search
    program = createProgram();
    const searchChunks: string[] = [];
    process.stdout.write = (chunk: any) => {
      searchChunks.push(chunk.toString());
      return true;
    };

    try {
      await program.parseAsync(['node', 'norescan', '--project', tempDir, '--json', 'search', 'main']);
    } finally {
      process.stdout.write = origWrite;
    }

    const searchOutput = JSON.parse(searchChunks.join(''));
    expect(searchOutput.success).toBe(true);
    expect(searchOutput.data.symbols.some((s: any) => s.name === 'main')).toBe(true);

    // 6. Doctor
    program = createProgram();
    const doctorChunks: string[] = [];
    process.stdout.write = (chunk: any) => {
      doctorChunks.push(chunk.toString());
      return true;
    };

    try {
      await program.parseAsync(['node', 'norescan', '--project', tempDir, '--json', 'doctor']);
    } finally {
      process.stdout.write = origWrite;
    }

    const doctorOutput = JSON.parse(doctorChunks.join(''));
    expect(doctorOutput.success).toBe(true);
    expect(doctorOutput.data.healthy).toBe(true);
  });

  it('runs polyglot, causal graph, blast, and sync CLI commands', async () => {
    // 1. Init & Scan
    let program = createProgram();
    await program.parseAsync(['node', 'norescan', '--project', tempDir, '--quiet', 'init']);
    program = createProgram();
    await program.parseAsync(['node', 'norescan', '--project', tempDir, '--quiet', 'scan']);

    const runJson = async (args: string[]) => {
      const prog = createProgram();
      const chunks: string[] = [];
      const origWrite = process.stdout.write;
      process.stdout.write = (chunk: any) => {
        chunks.push(chunk.toString());
        return true;
      };
      try {
        await prog.parseAsync(['node', 'norescan', '--project', tempDir, '--json', ...args]);
      } finally {
        process.stdout.write = origWrite;
      }
      return JSON.parse(chunks.join(''));
    };

    // 2. languages
    const langOut = await runJson(['languages']);
    expect(langOut.success).toBe(true);
    expect(langOut.data.stats.some((s: any) => s.language === 'typescript')).toBe(true);

    // 3. ecosystems
    const ecoOut = await runJson(['ecosystems']);
    expect(ecoOut.success).toBe(true);
    expect(ecoOut.data.some((e: any) => e.id === 'javascript')).toBe(true);

    // 4. graph
    const graphOut = await runJson(['graph']);
    expect(graphOut.success).toBe(true);
    expect(graphOut.data.stats.totalFiles).toBeGreaterThanOrEqual(1);

    // 5. blast
    const blastOut = await runJson(['blast', 'src/index.ts']);
    expect(blastOut.success).toBe(true);
    expect(blastOut.data.seedFiles).toContain('src/index.ts');

    // 6. sync status
    const syncOut = await runJson(['sync', 'status']);
    expect(syncOut.success).toBe(true);
    expect(syncOut.data.deviceId).toBeDefined();
  });

  it('runs whoami, login, devices, and logout commands', async () => {
    const runJson = async (args: string[]) => {
      const prog = createProgram();
      const chunks: string[] = [];
      const origWrite = process.stdout.write;
      process.stdout.write = (chunk: any) => {
        chunks.push(chunk.toString());
        return true;
      };
      try {
        await prog.parseAsync(['node', 'norescan', '--project', tempDir, '--json', ...args]);
      } finally {
        process.stdout.write = origWrite;
      }
      return JSON.parse(chunks.join(''));
    };

    // 1. Initial whoami (logged out)
    const whoamiInit = await runJson(['whoami']);
    expect(whoamiInit.success).toBe(true);
    expect(whoamiInit.data.loggedIn).toBe(false);
    expect(whoamiInit.data.entitlements.plan).toBe('community');

    // 2. Login with Pro token
    const loginOut = await runJson(['login', '--token', 'test-pro-tester']);
    expect(loginOut.success).toBe(true);
    expect(loginOut.data.email).toBe('tester@example.com');
    expect(loginOut.data.plan).toBe('pro');

    // 3. Whoami when logged in
    const whoamiLoggedIn = await runJson(['whoami']);
    expect(whoamiLoggedIn.success).toBe(true);
    expect(whoamiLoggedIn.data.loggedIn).toBe(true);
    expect(whoamiLoggedIn.data.account.email).toBe('tester@example.com');
    expect(whoamiLoggedIn.data.entitlements.plan).toBe('pro');

    // 4. Devices listing
    const devicesOut = await runJson(['devices']);
    expect(devicesOut.success).toBe(true);
    expect(devicesOut.data.length).toBeGreaterThan(0);

    // 5. Logout
    const logoutOut = await runJson(['logout']);
    expect(logoutOut.success).toBe(true);

    // 6. Whoami after logout
    const whoamiAfter = await runJson(['whoami']);
    expect(whoamiAfter.data.loggedIn).toBe(false);
    expect(whoamiAfter.data.entitlements.plan).toBe('community');
  });

  it('runs Phases 3 to 6 CLI commands (backup, billing, team, enterprise, marketplace)', async () => {
    // 1. Initialize repo
    let prog = createProgram();
    await prog.parseAsync(['node', 'norescan', '--project', tempDir, '--quiet', 'init']);
    prog = createProgram();
    await prog.parseAsync(['node', 'norescan', '--project', tempDir, '--quiet', 'scan']);

    const runJson = async (args: string[]) => {
      const p = createProgram();
      const chunks: string[] = [];
      const origWrite = process.stdout.write;
      process.stdout.write = (chunk: any) => {
        chunks.push(chunk.toString());
        return true;
      };
      try {
        await p.parseAsync(['node', 'norescan', '--project', tempDir, '--json', ...args]);
      } finally {
        process.stdout.write = origWrite;
      }
      return JSON.parse(chunks.join(''));
    };

    // Phase 3: Backup and Restore
    const backupFile = path.join(tempDir, 'backup-test.json');
    const backupOut = await runJson(['backup', backupFile, '--passphrase', 'test-pass']);
    expect(backupOut.success).toBe(true);
    expect(backupOut.data.metadata.filesCount).toBeGreaterThan(0);

    const restoreOut = await runJson(['restore', backupFile, '--passphrase', 'test-pass']);
    expect(restoreOut.success).toBe(true);
    expect(restoreOut.data.restoredFiles).toBeGreaterThan(0);

    // Phase 4: Billing
    const planOut = await runJson(['billing', 'plan']);
    expect(planOut.success).toBe(true);
    expect(planOut.data.plan).toBe('community');

    const checkoutOut = await runJson(['billing', 'checkout', 'pro', '--provider', 'razorpay']);
    expect(checkoutOut.success).toBe(true);
    expect(checkoutOut.data.amountMinor).toBe(49900);

    // Phase 5: Team
    const teamOut = await runJson(['team', 'create', 'Agency Corp', '--seats', '5']);
    expect(teamOut.success).toBe(true);
    expect(teamOut.data.name).toBe('Agency Corp');

    const configOut = await runJson(['team', 'config', teamOut.data.id]);
    expect(configOut.success).toBe(true);
    expect(configOut.data.cursorRules).toContain(teamOut.data.id);
    expect(configOut.data.cursorRules).toContain('norescan remember');

    // Phase 6: Enterprise & Marketplace
    const auditOut = await runJson(['enterprise', 'audit']);
    expect(auditOut.success).toBe(true);
    expect(auditOut.data.integrityValid).toBe(true);

    const mktOut = await runJson(['marketplace', 'list']);
    expect(mktOut.success).toBe(true);
    expect(mktOut.data.length).toBeGreaterThanOrEqual(4);
  });
});
