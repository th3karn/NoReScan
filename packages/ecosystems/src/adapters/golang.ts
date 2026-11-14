import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EcosystemAdapter,
  SupportedLanguage,
  PackageDependency,
  ProjectCommand,
  WorkspaceMember,
} from '../types.js';

export class GoAdapter implements EcosystemAdapter {
  public readonly id = 'golang';
  public readonly displayName = 'Go (Go Modules)';
  public readonly supportedLanguages: SupportedLanguage[] = ['golang'];
  public readonly manifestFiles = ['go.mod', 'go.work'];
  public readonly lockFiles = ['go.sum'];

  public async detect(projectRoot: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectRoot, 'go.mod'));
      return true;
    } catch {
      return false;
    }
  }

  public async extractDependencies(projectRoot: string): Promise<PackageDependency[]> {
    const deps: PackageDependency[] = [];
    const modPath = path.join(projectRoot, 'go.mod');

    try {
      const content = await fs.readFile(modPath, 'utf8');
      const lines = content.split('\n');
      let inRequireBlock = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('require (')) {
          inRequireBlock = true;
          continue;
        }
        if (inRequireBlock && trimmed === ')') {
          inRequireBlock = false;
          continue;
        }

        if (inRequireBlock || trimmed.startsWith('require ')) {
          const cleanLine = trimmed.replace(/^require\s+/, '');
          const parts = cleanLine.split(/\s+/);
          if (parts.length >= 2) {
            const name = parts[0];
            const version = parts[1];
            const isIndirect = cleanLine.includes('// indirect');
            deps.push({
              name,
              declaredVersion: version,
              versionConstraint: version,
              dependencyType: 'production',
              isDirect: !isIndirect,
              isOptional: false,
              manifestPath: 'go.mod',
              registry: 'proxy.golang.org',
            });
          }
        }
      }
    } catch {}

    return deps;
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return [
      {
        name: 'go-build',
        rawCommand: 'go build ./...',
        category: 'build',
        sourceFile: 'go.mod',
        workingDir: '.',
        description: 'Compile Go packages and dependencies',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'go-test',
        rawCommand: 'go test -v ./...',
        category: 'test',
        sourceFile: 'go.mod',
        workingDir: '.',
        description: 'Execute unit and integration tests across all packages',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'go-vet',
        rawCommand: 'go vet ./...',
        category: 'lint',
        sourceFile: 'go.mod',
        workingDir: '.',
        description: 'Examine Go source code and report suspicious constructs',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'go-tidy',
        rawCommand: 'go mod tidy',
        category: 'cleanup',
        sourceFile: 'go.mod',
        workingDir: '.',
        description: 'Add missing and remove unused modules',
        safeToRun: true,
        requiresNetwork: true,
        ecosystemId: this.id,
      },
    ];
  }

  public async detectWorkspaces(projectRoot: string): Promise<WorkspaceMember[]> {
    const members: WorkspaceMember[] = [];
    const workPath = path.join(projectRoot, 'go.work');

    try {
      const content = await fs.readFile(workPath, 'utf8');
      const useMatch = content.match(/use\s*\(([\s\S]*?)\)/);
      if (useMatch) {
        const dirs = useMatch[1].split('\n').map((d) => d.trim()).filter((d) => d && !d.startsWith('//'));
        for (const dir of dirs) {
          members.push({
            name: path.basename(dir),
            relativePath: dir.replace(/\\/g, '/'),
            ecosystemId: this.id,
            manifestPath: path.join(dir, 'go.mod').replace(/\\/g, '/'),
            dependencies: [],
          });
        }
      }
    } catch {}

    return members;
  }

  public async suggestCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return this.extractCommands(projectRoot);
  }
}
