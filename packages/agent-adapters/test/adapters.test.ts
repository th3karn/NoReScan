import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAllAdapters, getAdapter } from '../src/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('Universal Agent Adapters', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-cache-adapter-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('lists all registered adapters', () => {
    const adapters = getAllAdapters();
    const names = adapters.map((a) => a.name);
    expect(names).toContain('antigravity');
    expect(names).toContain('cursor');
    expect(names).toContain('claude-code');
    expect(names).toContain('codex');
    expect(names).toContain('vscode');
  });

  it('installs, validates, and uninstalls Antigravity adapter idempotently', async () => {
    const adapter = getAdapter('antigravity')!;
    expect(adapter).toBeDefined();

    // 1. Install
    const created = await adapter.install(tempDir);
    expect(created.length).toBeGreaterThan(0);

    const isValid = await adapter.validate(tempDir);
    expect(isValid).toBe(true);

    const mcpContent = await fs.readFile(
      path.join(tempDir, '.gemini', 'antigravity', 'mcp', 'code-cache.json'),
      'utf8'
    );
    expect(mcpContent).toContain('code-cache-mcp');

    const agentsMd = await fs.readFile(path.join(tempDir, 'AGENTS.md'), 'utf8');
    expect(agentsMd).toContain('code-cache Persistent Memory Protocol');

    // 2. Re-install is idempotent
    await adapter.install(tempDir);
    const agentsMdSecond = await fs.readFile(path.join(tempDir, 'AGENTS.md'), 'utf8');
    const occurrences = (agentsMdSecond.match(/code-cache Persistent Memory Protocol/g) || []).length;
    expect(occurrences).toBe(1);

    // 3. Uninstall
    await adapter.uninstall(tempDir);
    const isNowValid = await adapter.validate(tempDir);
    expect(isNowValid).toBe(false);
  });

  it('installs and uninstalls Cursor adapter', async () => {
    const adapter = getAdapter('cursor')!;
    await adapter.install(tempDir);

    expect(await adapter.validate(tempDir)).toBe(true);

    const ruleFile = path.join(tempDir, '.cursor', 'rules', 'code-cache.mdc');
    const stat = await fs.stat(ruleFile);
    expect(stat.isFile()).toBe(true);

    await adapter.uninstall(tempDir);
    expect(await adapter.validate(tempDir)).toBe(false);
  });
});
