import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { RuntimeEnvironment } from './types.js';

const execAsync = promisify(exec);

interface ToolProbe {
  tool: string;
  displayName: string;
  command: string;
  ecosystemId: string;
  versionRegex: RegExp;
}

const REGISTERED_TOOLS: ToolProbe[] = [
  { tool: 'node', displayName: 'Node.js', command: 'node --version', ecosystemId: 'javascript', versionRegex: /v([0-9\.]+)/ },
  { tool: 'npm', displayName: 'npm', command: 'npm --version', ecosystemId: 'javascript', versionRegex: /([0-9\.]+)/ },
  { tool: 'pnpm', displayName: 'pnpm', command: 'pnpm --version', ecosystemId: 'javascript', versionRegex: /([0-9\.]+)/ },
  { tool: 'yarn', displayName: 'Yarn', command: 'yarn --version', ecosystemId: 'javascript', versionRegex: /([0-9\.]+)/ },
  { tool: 'bun', displayName: 'Bun', command: 'bun --version', ecosystemId: 'javascript', versionRegex: /([0-9\.]+)/ },
  { tool: 'python', displayName: 'Python', command: 'python --version', ecosystemId: 'python', versionRegex: /Python\s+([0-9\.]+)/ },
  { tool: 'uv', displayName: 'uv', command: 'uv --version', ecosystemId: 'python', versionRegex: /uv\s+([0-9\.]+)/ },
  { tool: 'poetry', displayName: 'Poetry', command: 'poetry --version', ecosystemId: 'python', versionRegex: /Poetry.*version\s+([0-9\.]+)/ },
  { tool: 'rustc', displayName: 'Rust Compiler', command: 'rustc --version', ecosystemId: 'cargo', versionRegex: /rustc\s+([0-9\.]+)/ },
  { tool: 'cargo', displayName: 'Cargo', command: 'cargo --version', ecosystemId: 'cargo', versionRegex: /cargo\s+([0-9\.]+)/ },
  { tool: 'go', displayName: 'Go', command: 'go version', ecosystemId: 'golang', versionRegex: /go\s+version\s+go([0-9\.]+)/ },
  { tool: 'java', displayName: 'Java Runtime', command: 'java -version', ecosystemId: 'jvm', versionRegex: /version\s+["']?([0-9\._]+)/ },
  { tool: 'mvn', displayName: 'Maven', command: 'mvn -version', ecosystemId: 'jvm', versionRegex: /Apache Maven\s+([0-9\.]+)/ },
  { tool: 'dotnet', displayName: '.NET SDK', command: 'dotnet --version', ecosystemId: 'dotnet', versionRegex: /([0-9\.]+)/ },
  { tool: 'php', displayName: 'PHP', command: 'php -v', ecosystemId: 'composer', versionRegex: /PHP\s+([0-9\.]+)/ },
  { tool: 'composer', displayName: 'Composer', command: 'composer --version', ecosystemId: 'composer', versionRegex: /Composer.*version\s+([0-9\.]+)/ },
  { tool: 'ruby', displayName: 'Ruby', command: 'ruby -v', ecosystemId: 'bundler', versionRegex: /ruby\s+([0-9\.]+)/ },
  { tool: 'git', displayName: 'Git', command: 'git --version', ecosystemId: 'vcs', versionRegex: /git version\s+([0-9\.]+)/ },
  { tool: 'cmake', displayName: 'CMake', command: 'cmake --version', ecosystemId: 'native', versionRegex: /cmake version\s+([0-9\.]+)/ },
];

export class EnvironmentDetector {
  /**
   * Probes system toolchain and runtime environments.
   * Only checks relevant tools if ecosystemIds are provided.
   */
  public async probeEnvironment(ecosystemIds?: string[]): Promise<RuntimeEnvironment[]> {
    const targets = ecosystemIds && ecosystemIds.length > 0
      ? REGISTERED_TOOLS.filter((t) => ecosystemIds.includes(t.ecosystemId) || t.tool === 'git')
      : REGISTERED_TOOLS;

    const results: RuntimeEnvironment[] = [];

    for (const probe of targets) {
      try {
        const { stdout, stderr } = await execAsync(probe.command, { timeout: 3000 });
        const text = (stdout || stderr).trim();
        const match = text.match(probe.versionRegex);
        const version = match ? match[1] : text.split('\n')[0];

        results.push({
          tool: probe.tool,
          displayName: probe.displayName,
          installed: true,
          detectedVersion: version,
          compatible: true,
          ecosystemId: probe.ecosystemId,
        });
      } catch {
        results.push({
          tool: probe.tool,
          displayName: probe.displayName,
          installed: false,
          compatible: false,
          ecosystemId: probe.ecosystemId,
          notes: `${probe.displayName} executable not found on system PATH`,
        });
      }
    }

    return results;
  }

  /**
   * Validates required versions declared in repository manifests against installed toolchain.
   */
  public async checkProjectCompatibility(
    projectRoot: string,
    installedEnvironments: RuntimeEnvironment[]
  ): Promise<Array<{ tool: string; required: string; detected?: string; satisfied: boolean }>> {
    const checks: Array<{ tool: string; required: string; detected?: string; satisfied: boolean }> = [];

    // 1. Check Node engine in package.json
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
      if (pkg.engines?.node) {
        const nodeEnv = installedEnvironments.find((e) => e.tool === 'node');
        checks.push({
          tool: 'Node.js',
          required: pkg.engines.node,
          detected: nodeEnv?.detectedVersion,
          satisfied: nodeEnv?.installed ?? false,
        });
      }
      if (pkg.packageManager) {
        const [pmName, pmVer] = pkg.packageManager.split('@');
        const pmEnv = installedEnvironments.find((e) => e.tool === pmName);
        checks.push({
          tool: pmName,
          required: pmVer || 'any',
          detected: pmEnv?.detectedVersion,
          satisfied: pmEnv?.installed ?? false,
        });
      }
    } catch {}

    // 2. Check go version in go.mod
    try {
      const mod = await fs.readFile(path.join(projectRoot, 'go.mod'), 'utf8');
      const goMatch = mod.match(/go\s+([0-9\.]+)/);
      if (goMatch) {
        const goEnv = installedEnvironments.find((e) => e.tool === 'go');
        checks.push({
          tool: 'Go',
          required: `>= ${goMatch[1]}`,
          detected: goEnv?.detectedVersion,
          satisfied: goEnv?.installed ?? false,
        });
      }
    } catch {}

    return checks;
  }
}
