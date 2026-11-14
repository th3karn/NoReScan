import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EcosystemAdapter,
  SupportedLanguage,
  PackageDependency,
  ProjectCommand,
  WorkspaceMember,
} from '../types.js';

export class SwiftAdapter implements EcosystemAdapter {
  public readonly id = 'spm';
  public readonly displayName = 'Swift (Swift Package Manager)';
  public readonly supportedLanguages: SupportedLanguage[] = ['swift'];
  public readonly manifestFiles = ['Package.swift'];
  public readonly lockFiles = ['Package.resolved'];

  public async detect(projectRoot: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectRoot, 'Package.swift'));
      return true;
    } catch {
      return false;
    }
  }

  public async extractDependencies(projectRoot: string): Promise<PackageDependency[]> {
    return [];
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return [
      {
        name: 'swift-build',
        rawCommand: 'swift build',
        category: 'build',
        sourceFile: 'Package.swift',
        workingDir: '.',
        description: 'Build Swift package targets',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'swift-test',
        rawCommand: 'swift test',
        category: 'test',
        sourceFile: 'Package.swift',
        workingDir: '.',
        description: 'Execute XCTest test suite',
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

export class ElixirAdapter implements EcosystemAdapter {
  public readonly id = 'mix';
  public readonly displayName = 'Elixir & Erlang (Mix / Hex)';
  public readonly supportedLanguages: SupportedLanguage[] = ['elixir', 'erlang'];
  public readonly manifestFiles = ['mix.exs', 'rebar.config'];
  public readonly lockFiles = ['mix.lock', 'rebar.lock'];

  public async detect(projectRoot: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectRoot, 'mix.exs'));
      return true;
    } catch {
      return false;
    }
  }

  public async extractDependencies(projectRoot: string): Promise<PackageDependency[]> {
    return [];
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return [
      {
        name: 'mix-deps-get',
        rawCommand: 'mix deps.get',
        category: 'install',
        sourceFile: 'mix.exs',
        workingDir: '.',
        description: 'Fetch project Hex dependencies',
        safeToRun: true,
        requiresNetwork: true,
        ecosystemId: this.id,
      },
      {
        name: 'mix-test',
        rawCommand: 'mix test',
        category: 'test',
        sourceFile: 'mix.exs',
        workingDir: '.',
        description: 'Run ExUnit test suite',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'mix-compile',
        rawCommand: 'mix compile',
        category: 'build',
        sourceFile: 'mix.exs',
        workingDir: '.',
        description: 'Compile Elixir project source files',
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

export class ZigAdapter implements EcosystemAdapter {
  public readonly id = 'zig';
  public readonly displayName = 'Zig (Zig Build System)';
  public readonly supportedLanguages: SupportedLanguage[] = ['zig'];
  public readonly manifestFiles = ['build.zig', 'build.zig.zon'];
  public readonly lockFiles = [];

  public async detect(projectRoot: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectRoot, 'build.zig'));
      return true;
    } catch {
      return false;
    }
  }

  public async extractDependencies(projectRoot: string): Promise<PackageDependency[]> {
    return [];
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return [
      {
        name: 'zig-build',
        rawCommand: 'zig build',
        category: 'build',
        sourceFile: 'build.zig',
        workingDir: '.',
        description: 'Build Zig targets',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'zig-test',
        rawCommand: 'zig build test',
        category: 'test',
        sourceFile: 'build.zig',
        workingDir: '.',
        description: 'Run Zig unit test targets',
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
