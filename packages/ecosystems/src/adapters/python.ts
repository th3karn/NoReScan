import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EcosystemAdapter,
  SupportedLanguage,
  PackageDependency,
  ProjectCommand,
  WorkspaceMember,
} from '../types.js';

export class PythonAdapter implements EcosystemAdapter {
  public readonly id = 'python';
  public readonly displayName = 'Python (pip / uv / Poetry / venv)';
  public readonly supportedLanguages: SupportedLanguage[] = ['python'];
  public readonly manifestFiles = ['pyproject.toml', 'requirements.txt', 'Pipfile', 'setup.py', 'environment.yml'];
  public readonly lockFiles = ['uv.lock', 'poetry.lock', 'Pipfile.lock', 'pdm.lock'];

  public async detect(projectRoot: string): Promise<boolean> {
    for (const f of this.manifestFiles) {
      try {
        await fs.access(path.join(projectRoot, f));
        return true;
      } catch {}
    }
    return false;
  }

  public async extractDependencies(projectRoot: string): Promise<PackageDependency[]> {
    const deps: PackageDependency[] = [];

    // 1. Parse requirements.txt
    try {
      const content = await fs.readFile(path.join(projectRoot, 'requirements.txt'), 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-r') || trimmed.startsWith('-e')) continue;

        const match = trimmed.match(/^([a-zA-Z0-9_\-\.]+)(.*)$/);
        if (match) {
          const name = match[1];
          const constraint = match[2].trim() || '*';
          deps.push({
            name,
            declaredVersion: constraint,
            versionConstraint: constraint,
            dependencyType: 'production',
            isDirect: true,
            isOptional: false,
            manifestPath: 'requirements.txt',
            registry: 'pypi',
          });
        }
      }
    } catch {}

    // 2. Parse pyproject.toml
    try {
      const content = await fs.readFile(path.join(projectRoot, 'pyproject.toml'), 'utf8');
      // Look for dependencies array under [project]
      const depMatch = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
      if (depMatch) {
        const rawItems = depMatch[1].match(/"([^"]+)"|'([^']+)'/g) || [];
        for (const item of rawItems) {
          const cleaned = item.replace(/['"]/g, '').trim();
          const parsed = cleaned.match(/^([a-zA-Z0-9_\-\.]+)(.*)$/);
          if (parsed) {
            deps.push({
              name: parsed[1],
              declaredVersion: parsed[2].trim() || '*',
              versionConstraint: parsed[2].trim() || '*',
              dependencyType: 'production',
              isDirect: true,
              isOptional: false,
              manifestPath: 'pyproject.toml',
              registry: 'pypi',
            });
          }
        }
      }

      // Look for Poetry dependencies
      const poetryMatch = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(\n\[|$)/);
      if (poetryMatch) {
        const lines = poetryMatch[1].split('\n');
        for (const l of lines) {
          const match = l.match(/^([a-zA-Z0-9_\-\.]+)\s*=\s*["']([^"']+)["']/);
          if (match && match[1] !== 'python') {
            deps.push({
              name: match[1],
              declaredVersion: match[2],
              versionConstraint: match[2],
              dependencyType: 'production',
              isDirect: true,
              isOptional: false,
              manifestPath: 'pyproject.toml',
              registry: 'pypi',
            });
          }
        }
      }
    } catch {}

    return deps;
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    const commands: ProjectCommand[] = [];

    // Check for uv
    let hasUvLock = false;
    try {
      await fs.access(path.join(projectRoot, 'uv.lock'));
      hasUvLock = true;
    } catch {}

    // Check for poetry
    let hasPoetryLock = false;
    try {
      await fs.access(path.join(projectRoot, 'poetry.lock'));
      hasPoetryLock = true;
    } catch {}

    // Check for venv
    let hasVenv = false;
    for (const v of ['.venv', 'venv']) {
      try {
        await fs.access(path.join(projectRoot, v));
        hasVenv = true;
        break;
      } catch {}
    }

    if (hasUvLock) {
      commands.push(
        {
          name: 'uv-sync',
          rawCommand: 'uv sync',
          category: 'install',
          sourceFile: 'uv.lock',
          workingDir: '.',
          description: 'Synchronize project virtual environment using uv',
          safeToRun: true,
          requiresNetwork: true,
          ecosystemId: this.id,
        },
        {
          name: 'uv-test',
          rawCommand: 'uv run pytest',
          category: 'test',
          sourceFile: 'pyproject.toml',
          workingDir: '.',
          description: 'Run test suite inside uv environment',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        }
      );
    } else if (hasPoetryLock) {
      commands.push(
        {
          name: 'poetry-install',
          rawCommand: 'poetry install',
          category: 'install',
          sourceFile: 'poetry.lock',
          workingDir: '.',
          description: 'Install dependencies using Poetry',
          safeToRun: true,
          requiresNetwork: true,
          ecosystemId: this.id,
        },
        {
          name: 'poetry-test',
          rawCommand: 'poetry run pytest',
          category: 'test',
          sourceFile: 'pyproject.toml',
          workingDir: '.',
          description: 'Run test suite with Poetry',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        }
      );
    } else {
      commands.push(
        {
          name: 'pip-install',
          rawCommand: 'pip install -r requirements.txt',
          category: 'install',
          sourceFile: 'requirements.txt',
          workingDir: '.',
          description: 'Install requirements via pip',
          safeToRun: true,
          requiresNetwork: true,
          ecosystemId: this.id,
        },
        {
          name: 'pytest',
          rawCommand: 'python -m pytest',
          category: 'test',
          sourceFile: 'pyproject.toml',
          workingDir: '.',
          description: 'Run tests with pytest module',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        }
      );
    }

    // Add virtual environment activation command
    const isWindows = process.platform === 'win32';
    commands.push({
      name: 'activate-venv',
      rawCommand: isWindows ? '.\\.venv\\Scripts\\Activate.ps1' : 'source .venv/bin/activate',
      category: 'environment',
      sourceFile: hasVenv ? '.venv' : 'python',
      workingDir: '.',
      description: hasVenv ? 'Activate existing local virtual environment' : 'Activate Python virtual environment',
      safeToRun: true,
      requiresNetwork: false,
      ecosystemId: this.id,
    });

    return commands;
  }

  public async detectWorkspaces(projectRoot: string): Promise<WorkspaceMember[]> {
    return [];
  }

  public async suggestCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return this.extractCommands(projectRoot);
  }
}

