import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EcosystemAdapter,
  SupportedLanguage,
  PackageDependency,
  ProjectCommand,
  WorkspaceMember,
} from '../types.js';

export class CppAdapter implements EcosystemAdapter {
  public readonly id = 'native';
  public readonly displayName = 'C & C++ (CMake / vcpkg / Conan / Make)';
  public readonly supportedLanguages: SupportedLanguage[] = ['c', 'cpp'];
  public readonly manifestFiles = ['CMakeLists.txt', 'vcpkg.json', 'conanfile.txt', 'Makefile'];
  public readonly lockFiles = ['vcpkg-configuration.json', 'conan.lock'];

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

    // Check vcpkg.json
    try {
      const content = await fs.readFile(path.join(projectRoot, 'vcpkg.json'), 'utf8');
      const parsed = JSON.parse(content);
      const list = parsed.dependencies || [];
      for (const item of list) {
        const name = typeof item === 'string' ? item : item.name;
        deps.push({
          name,
          declaredVersion: typeof item === 'object' && item.version ? item.version : 'latest',
          versionConstraint: typeof item === 'object' && item.version ? item.version : '*',
          dependencyType: 'production',
          isDirect: true,
          isOptional: false,
          manifestPath: 'vcpkg.json',
          registry: 'vcpkg',
        });
      }
    } catch {}

    // Check CMakeLists.txt find_package calls
    try {
      const content = await fs.readFile(path.join(projectRoot, 'CMakeLists.txt'), 'utf8');
      const fpRegex = /find_package\s*\(\s*([a-zA-Z0-9_\-]+)(?:\s+([0-9\.]+))?/g;
      let match;
      while ((match = fpRegex.exec(content)) !== null) {
        deps.push({
          name: match[1],
          declaredVersion: match[2] || 'system',
          versionConstraint: match[2] || '*',
          dependencyType: 'build',
          isDirect: true,
          isOptional: false,
          manifestPath: 'CMakeLists.txt',
          registry: 'cmake-find-package',
        });
      }
    } catch {}

    return deps;
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    let hasCMake = false;
    let hasMake = false;
    try { await fs.access(path.join(projectRoot, 'CMakeLists.txt')); hasCMake = true; } catch {}
    try { await fs.access(path.join(projectRoot, 'Makefile')); hasMake = true; } catch {}

    const commands: ProjectCommand[] = [];

    if (hasCMake) {
      commands.push(
        {
          name: 'cmake-configure',
          rawCommand: 'cmake -S . -B build',
          category: 'setup',
          sourceFile: 'CMakeLists.txt',
          workingDir: '.',
          description: 'Generate native build system files in build/ directory',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        },
        {
          name: 'cmake-build',
          rawCommand: 'cmake --build build',
          category: 'build',
          sourceFile: 'CMakeLists.txt',
          workingDir: '.',
          description: 'Compile native binary targets',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        },
        {
          name: 'cmake-test',
          rawCommand: 'ctest --test-dir build --output-on-failure',
          category: 'test',
          sourceFile: 'CMakeLists.txt',
          workingDir: '.',
          description: 'Execute CTest suite',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        }
      );
    } else if (hasMake) {
      commands.push(
        {
          name: 'make-all',
          rawCommand: 'make',
          category: 'build',
          sourceFile: 'Makefile',
          workingDir: '.',
          description: 'Build default targets defined in Makefile',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        },
        {
          name: 'make-test',
          rawCommand: 'make test',
          category: 'test',
          sourceFile: 'Makefile',
          workingDir: '.',
          description: 'Run test target in Makefile',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        }
      );
    }

    return commands;
  }

  public async detectWorkspaces(projectRoot: string): Promise<WorkspaceMember[]> {
    return [];
  }

  public async suggestCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return this.extractCommands(projectRoot);
  }
}

