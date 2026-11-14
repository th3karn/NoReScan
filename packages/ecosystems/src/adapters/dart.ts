import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EcosystemAdapter,
  SupportedLanguage,
  PackageDependency,
  ProjectCommand,
  WorkspaceMember,
} from '../types.js';

export class DartAdapter implements EcosystemAdapter {
  public readonly id = 'pub';
  public readonly displayName = 'Dart & Flutter (pub / pubspec)';
  public readonly supportedLanguages: SupportedLanguage[] = ['dart', 'flutter'];
  public readonly manifestFiles = ['pubspec.yaml'];
  public readonly lockFiles = ['pubspec.lock'];

  public async detect(projectRoot: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectRoot, 'pubspec.yaml'));
      return true;
    } catch {
      return false;
    }
  }

  public async extractDependencies(projectRoot: string): Promise<PackageDependency[]> {
    const deps: PackageDependency[] = [];
    const pubPath = path.join(projectRoot, 'pubspec.yaml');

    try {
      const content = await fs.readFile(pubPath, 'utf8');

      const parseSection = (sectionName: string, type: PackageDependency['dependencyType']) => {
        const regex = new RegExp(`^${sectionName}:([\\s\\S]*?)(^\\w|$)`, 'm');
        const match = content.match(regex);
        if (match) {
          const lines = match[1].split('\n');
          for (const l of lines) {
            const m = l.match(/^\s+([a-zA-Z0-9_\-]+):\s*([^\s#]+)?/);
            if (m && m[1] !== 'flutter' && m[1] !== 'sdk') {
              deps.push({
                name: m[1],
                declaredVersion: m[2] || 'any',
                versionConstraint: m[2] || 'any',
                dependencyType: type,
                isDirect: true,
                isOptional: false,
                manifestPath: 'pubspec.yaml',
                registry: 'pub.dev',
              });
            }
          }
        }
      };

      parseSection('dependencies', 'production');
      parseSection('dev_dependencies', 'development');
    } catch {}

    return deps;
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    let isFlutter = false;
    try {
      const content = await fs.readFile(path.join(projectRoot, 'pubspec.yaml'), 'utf8');
      if (content.includes('flutter:')) isFlutter = true;
    } catch {}

    const cli = isFlutter ? 'flutter' : 'dart';

    return [
      {
        name: `${cli}-get`,
        rawCommand: `${cli} pub get`,
        category: 'install',
        sourceFile: 'pubspec.yaml',
        workingDir: '.',
        description: `Install package dependencies via ${cli}`,
        safeToRun: true,
        requiresNetwork: true,
        ecosystemId: this.id,
      },
      {
        name: `${cli}-test`,
        rawCommand: `${cli} test`,
        category: 'test',
        sourceFile: 'pubspec.yaml',
        workingDir: '.',
        description: `Run unit and widget tests via ${cli}`,
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

