import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createProgram } from '../src/cli.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('RepoMind CLI Commands', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomind-cli-test-'));

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
      await program.parseAsync(['node', 'repomind', '--project', tempDir, '--json', 'init', 'my-test-proj']);
    } finally {
      process.stdout.write = origWrite;
    }

    const output = JSON.parse(stdoutChunks.join(''));
    expect(output.success).toBe(true);
    expect(output.command).toBe('init');
    expect(output.data.projectName).toBe('my-test-proj');
  });

  it('runs scan and status end-to-end', async () => {
    // 1. Init
    let program = createProgram();
    await program.parseAsync(['node', 'repomind', '--project', tempDir, '--quiet', 'init']);

    // 2. Scan
    program = createProgram();
    const scanChunks: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = (chunk: any) => {
      scanChunks.push(chunk.toString());
      return true;
    };

    try {
      await program.parseAsync(['node', 'repomind', '--project', tempDir, '--json', 'scan']);
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
      await program.parseAsync(['node', 'repomind', '--project', tempDir, '--json', 'status']);
    } finally {
      process.stdout.write = origWrite;
    }

    const statusOutput = JSON.parse(statusChunks.join(''));
    expect(statusOutput.success).toBe(true);
    expect(statusOutput.data.totalFiles).toBe(2);
    expect(statusOutput.data.validAnalyses).toBe(2);
  });
});
