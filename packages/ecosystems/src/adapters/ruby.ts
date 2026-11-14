import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EcosystemAdapter,
  SupportedLanguage,
  PackageDependency,
  ProjectCommand,
  WorkspaceMember,
} from '../types.js';

export class RubyAdapter implements EcosystemAdapter {
  public readonly id = 'bundler';
  public readonly displayName = 'Ruby (Bundler / RubyGems)';
  public readonly supportedLanguages: SupportedLanguage[] = ['ruby'];
  public readonly manifestFiles = ['Gemfile', '*.gemspec'];
  public readonly lockFiles = ['Gemfile.lock'];

  public async detect(projectRoot: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectRoot, 'Gemfile'));
      return true;
    } catch {
      return false;
    }
  }

  public async extractDependencies(projectRoot: string): Promise<PackageDependency[]> {
    const deps: PackageDependency[] = [];
    const gemfilePath = path.join(projectRoot, 'Gemfile');

    try {
      const content = await fs.readFile(gemfilePath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('gem ')) {
          const match = trimmed.match(/^gem\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/);
          if (match) {
            deps.push({
              name: match[1],
              declaredVersion: match[2] || 'latest',
              versionConstraint: match[2] || 'latest',
              dependencyType: 'production',
              isDirect: true,
              isOptional: false,
              manifestPath: 'Gemfile',
              registry: 'rubygems.org',
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
        name: 'bundle-install',
        rawCommand: 'bundle install',
        category: 'install',
        sourceFile: 'Gemfile',
        workingDir: '.',
        description: 'Install dependencies with Bundler',
        safeToRun: true,
        requiresNetwork: true,
        ecosystemId: this.id,
      },
      {
        name: 'bundle-test',
        rawCommand: 'bundle exec rspec',
        category: 'test',
        sourceFile: 'Gemfile',
        workingDir: '.',
        description: 'Run RSpec test suite',
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

