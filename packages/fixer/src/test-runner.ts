import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { NoReScanCore } from '@norescan/core';
import { ErrorParser, DiagnosticError } from './error-parser.js';
import { FixerEngine, FixProposal } from './fixer-engine.js';

const execAsync = promisify(exec);

export interface TestRunResult {
  passed: boolean;
  testCommand: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  errors: DiagnosticError[];
  proposals: FixProposal[];
  fixesApplied: number;
  verifiedPassed?: boolean;
}

export class AutoTestRunner {
  private fixer: FixerEngine;

  constructor(private core: NoReScanCore) {
    this.fixer = new FixerEngine(core);
  }

  /**
   * Automatically discovers the project's test command from NoReScan ecosystems.
   */
  public async detectTestCommand(): Promise<string> {
    try {
      const cmds = this.core.getProjectCommands('test');
      if (cmds && cmds.length > 0) {
        return cmds[0].rawCommand;
      }
    } catch {
      // fallback
    }
    return 'npm test';
  }

  /**
   * Runs the test suite with autonomous failure localization and optional auto-healing.
   */
  public async runAndFix(customCommand?: string, autoFix = false): Promise<TestRunResult> {
    const command = customCommand || (await this.detectTestCommand());
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
      const res = await execAsync(command, { cwd: this.core.projectRoot });
      stdout = res.stdout;
      stderr = res.stderr;
    } catch (err: any) {
      exitCode = err.code ?? 1;
      stdout = err.stdout ?? '';
      stderr = err.stderr ?? '';
    }

    if (exitCode === 0) {
      return {
        passed: true,
        testCommand: command,
        exitCode: 0,
        stdout,
        stderr,
        errors: [],
        proposals: [],
        fixesApplied: 0,
        verifiedPassed: true,
      };
    }

    // Parse failures
    const combinedOutput = `${stdout}\n${stderr}`;
    const errors = ErrorParser.parseOutput(combinedOutput);
    const proposals = await this.fixer.diagnose(errors);

    let fixesApplied = 0;
    let verifiedPassed = false;

    if (autoFix && proposals.length > 0) {
      fixesApplied = await this.fixer.applyFixes(proposals);

      // Re-run test to verify
      try {
        const recheck = await execAsync(command, { cwd: this.core.projectRoot });
        verifiedPassed = true;
        stdout = recheck.stdout;
        stderr = recheck.stderr;
      } catch {
        verifiedPassed = false;
      }
    }

    return {
      passed: false,
      testCommand: command,
      exitCode,
      stdout,
      stderr,
      errors,
      proposals,
      fixesApplied,
      verifiedPassed,
    };
  }
}
