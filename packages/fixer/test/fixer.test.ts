import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { NoReScanCore } from '@norescan/core';
import { ErrorParser } from '../src/error-parser.js';
import { FixerEngine } from '../src/fixer-engine.js';

describe('@norescan/fixer Diagnostic & Auto-Healing Subsystem', () => {
  let tempDir: string;
  let core: NoReScanCore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'norescan-fixer-test-'));
    core = new NoReScanCore(tempDir);
    await core.init('test-fixer');
  });

  afterEach(async () => {
    core.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('parses TypeScript compiler errors accurately', () => {
    const raw = `
src/index.ts(12,5): error TS2307: Cannot find module '@norescanhared' or its corresponding type declarations.
src/utils.ts(45,10): error TS1005: ';' expected.
`;
    const errors = ErrorParser.parseOutput(raw);
    expect(errors.length).toBe(2);
    expect(errors[0].filePath).toBe('src/index.ts');
    expect(errors[0].lineNumber).toBe(12);
    expect(errors[0].errorType).toBe('import_not_found');
    expect(errors[1].filePath).toBe('src/utils.ts');
    expect(errors[1].errorType).toBe('syntax');
  });

  it('parses Python traceback errors accurately', () => {
    const raw = `
Traceback (most recent call last):
  File "sdk/python/tests/test_sdk.py", line 6, in <module>
    from code_cache.client import CodeCacheClient
ModuleNotFoundError: No module named 'code_cache'
`;
    const errors = ErrorParser.parseOutput(raw);
    expect(errors.length).toBeGreaterThan(0);
    const pyErr = errors.find((e) => e.filePath?.includes('test_sdk.py'));
    expect(pyErr).toBeDefined();
    expect(pyErr?.lineNumber).toBe(6);
    expect(pyErr?.errorType).toBe('import_not_found');
  });

  it('diagnoses broken imports and applies automated fixes', async () => {
    const brokenFile = path.join(tempDir, 'src', 'broken.ts');
    await fs.mkdir(path.dirname(brokenFile), { recursive: true });
    await fs.writeFile(
      brokenFile,
      `import { AstMetadata } from '@norescanhared';\nimport { x } from '@bugbrain/core';\n`,
      'utf8'
    );

    const fixer = new FixerEngine(core);
    const errors = [
      {
        filePath: 'src/broken.ts',
        lineNumber: 1,
        message: "Cannot find module '@norescanhared'",
        rawText: "src/broken.ts(1,1): error TS2307: Cannot find module '@norescanhared'",
        errorType: 'import_not_found' as const,
      },
    ];

    const proposals = await fixer.diagnose(errors);
    expect(proposals.length).toBeGreaterThanOrEqual(1);

    const applied = await fixer.applyFixes(proposals);
    expect(applied).toBeGreaterThan(0);

    const healedContent = await fs.readFile(brokenFile, 'utf8');
    expect(healedContent).toContain("@norescan/shared");
    expect(healedContent).toContain("@norescan/core");
  });
});
