import { ProjectCommand } from './types.js';

export interface CommandInspection {
  command: ProjectCommand;
  isDestructive: boolean;
  requiresNetwork: boolean;
  changesFiles: boolean;
  explanation: string;
  safetyWarnings: string[];
}

const FORBIDDEN_PATTERNS = [
  /curl.*\|\s*(ba)?sh/i,
  /wget.*\|\s*(ba)?sh/i,
  /rm\s+-rf\s+[\/~]/i,
  /drop\s+database/i,
  /format\s+[c-z]:/i,
  /:(){ :\|:& };:/, // Fork bomb
  /sudo\s+rm/i,
];

export class SafeCommandRunner {
  /**
   * Inspects a project command and provides safety classification and warnings.
   */
  public inspectCommand(command: ProjectCommand): CommandInspection {
    const raw = command.rawCommand;
    const warnings: string[] = [];

    let isDestructive = false;
    let changesFiles = false;
    let requiresNetwork = command.requiresNetwork;

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(raw)) {
        isDestructive = true;
        warnings.push(`Command matches blocked unsafe execution pattern: ${pattern.toString()}`);
      }
    }

    if (raw.includes('install') || raw.includes('add') || raw.includes('update')) {
      changesFiles = true;
      requiresNetwork = true;
    }

    if (command.category === 'build' || command.category === 'migration' || command.category === 'cleanup') {
      changesFiles = true;
    }

    if (command.category === 'cleanup' || raw.includes('rimraf') || raw.includes('clean')) {
      isDestructive = true;
      warnings.push('This command will delete files or build artifacts.');
    }

    let explanation = `Executes "${command.name}" configured in ${command.sourceFile}.`;
    if (changesFiles) {
      explanation += ' This command may modify files or download packages.';
    }

    return {
      command,
      isDestructive,
      requiresNetwork,
      changesFiles,
      explanation,
      safetyWarnings: warnings,
    };
  }

  /**
   * Validates if a command is allowed to run.
   */
  public validateExecution(command: ProjectCommand): { allowed: boolean; reason?: string } {
    const inspection = this.inspectCommand(command);
    if (inspection.safetyWarnings.some((w) => w.includes('blocked unsafe execution pattern'))) {
      return {
        allowed: false,
        reason: 'Command blocked by security policy due to unsafe execution pattern.',
      };
    }
    return { allowed: true };
  }
}

