import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EcosystemAdapter,
  SupportedLanguage,
  PackageDependency,
  ProjectCommand,
  WorkspaceMember,
} from '../types.js';

export class PhpAdapter implements EcosystemAdapter {
  public readonly id = 'composer';
  public readonly displayName = 'PHP (Composer / Packagist)';
  public readonly supportedLanguages: SupportedLanguage[] = ['php'];
  public readonly manifestFiles = ['composer.json'];
  public readonly lockFiles = ['composer.lock'];

  public async detect(projectRoot: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectRoot, 'composer.json'));
      return true;
    } catch {
      return false;
    }
  }

  public async extractDependencies(projectRoot: string): Promise<PackageDependency[]> {
    const deps: PackageDependency[] = [];
    const compPath = path.join(projectRoot, 'composer.json');

    try {
      const content = await fs.readFile(compPath, 'utf8');
      const pkg = JSON.parse(content);

      const addGroup = (group: Record<string, string> | undefined, type: PackageDependency['dependencyType']) => {
        if (!group) return;
        for (const [name, version] of Object.entries(group)) {
          if (name === 'php' || name.startsWith('ext-')) continue;
          deps.push({
            name,
            declaredVersion: String(version),
            versionConstraint: String(version),
            dependencyType: type,
            isDirect: true,
            isOptional: false,
            manifestPath: 'composer.json',
            registry: 'packagist.org',
          });
        }
      };

      addGroup(pkg.require, 'production');
      addGroup(pkg['require-dev'], 'development');
    } catch {}

    return deps;
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return [
      {
        name: 'composer-install',
        rawCommand: 'composer install',
        category: 'install',
        sourceFile: 'composer.json',
        workingDir: '.',
        description: 'Install composer dependencies from lockfile',
        safeToRun: true,
        requiresNetwork: true,
        ecosystemId: this.id,
      },
      {
        name: 'composer-test',
        rawCommand: 'composer test',
        category: 'test',
        sourceFile: 'composer.json',
        workingDir: '.',
        description: 'Run test suite via composer script or phpunit',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
    ];
  }

  public async detectWorkspaces(projectRoot: string): Promise<WorkspaceMember[]> {
    return [];
  }

  public async suggestCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return this.extractCommands(projectRoot);
  }
}

