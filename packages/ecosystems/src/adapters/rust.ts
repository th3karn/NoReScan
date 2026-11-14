import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EcosystemAdapter,
  SupportedLanguage,
  PackageDependency,
  ProjectCommand,
  WorkspaceMember,
} from '../types.js';

export class RustAdapter implements EcosystemAdapter {
  public readonly id = 'cargo';
  public readonly displayName = 'Rust (Cargo / crates.io)';
  public readonly supportedLanguages: SupportedLanguage[] = ['rust'];
  public readonly manifestFiles = ['Cargo.toml', 'rust-toolchain.toml', 'rust-toolchain'];
  public readonly lockFiles = ['Cargo.lock'];

  public async detect(projectRoot: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectRoot, 'Cargo.toml'));
      return true;
    } catch {
      return false;
    }
  }

  public async extractDependencies(projectRoot: string): Promise<PackageDependency[]> {
    const deps: PackageDependency[] = [];
    const cargoPath = path.join(projectRoot, 'Cargo.toml');

    try {
      const content = await fs.readFile(cargoPath, 'utf8');

      const parseSection = (sectionName: string, type: PackageDependency['dependencyType']) => {
        const regex = new RegExp(`\\[${sectionName}\\]([\\s\\S]*?)(\\n\\[|$)`);
        const match = content.match(regex);
        if (match) {
          const lines = match[1].split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            // e.g. serde = "1.0" or serde = { version = "1.0", features = ["derive"] }
            const simpleMatch = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*=\s*["']([^"']+)["']/);
            if (simpleMatch) {
              deps.push({
                name: simpleMatch[1],
                declaredVersion: simpleMatch[2],
                versionConstraint: simpleMatch[2],
                dependencyType: type,
                isDirect: true,
                isOptional: false,
                manifestPath: 'Cargo.toml',
                registry: 'crates.io',
              });
              continue;
            }

            const tableMatch = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*=\s*\{([\s\S]*?)\}/);
            if (tableMatch) {
              const name = tableMatch[1];
              const inner = tableMatch[2];
              const verMatch = inner.match(/version\s*=\s*["']([^"']+)["']/);
              const optional = inner.includes('optional = true');
              deps.push({
                name,
                declaredVersion: verMatch ? verMatch[1] : '*',
                versionConstraint: verMatch ? verMatch[1] : '*',
                dependencyType: type,
                isDirect: true,
                isOptional: optional,
                manifestPath: 'Cargo.toml',
                registry: 'crates.io',
              });
            }
          }
        }
      };

      parseSection('dependencies', 'production');
      parseSection('dev-dependencies', 'development');
      parseSection('build-dependencies', 'build');
    } catch {}

    return deps;
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return [
      {
        name: 'cargo-build',
        rawCommand: 'cargo build',
        category: 'build',
        sourceFile: 'Cargo.toml',
        workingDir: '.',
        description: 'Compile the crate or workspace members',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'cargo-test',
        rawCommand: 'cargo test',
        category: 'test',
        sourceFile: 'Cargo.toml',
        workingDir: '.',
        description: 'Run unit, integration, and doc tests',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'cargo-check',
        rawCommand: 'cargo check',
        category: 'typecheck',
        sourceFile: 'Cargo.toml',
        workingDir: '.',
        description: 'Analyze current package and report compiler errors without emitting binaries',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'cargo-clippy',
        rawCommand: 'cargo clippy',
        category: 'lint',
        sourceFile: 'Cargo.toml',
        workingDir: '.',
        description: 'Run Clippy linter for common mistakes and improvements',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'cargo-fmt',
        rawCommand: 'cargo fmt --check',
        category: 'format',
        sourceFile: 'Cargo.toml',
        workingDir: '.',
        description: 'Verify Rust code formatting compliance',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
    ];
  }

  public async detectWorkspaces(projectRoot: string): Promise<WorkspaceMember[]> {
    const members: WorkspaceMember[] = [];
    const cargoPath = path.join(projectRoot, 'Cargo.toml');

    try {
      const content = await fs.readFile(cargoPath, 'utf8');
      const wsMatch = content.match(/\[workspace\][\s\S]*?members\s*=\s*\[([\s\S]*?)\]/);
      if (wsMatch) {
        const rawMembers = wsMatch[1].match(/"([^"]+)"|'([^']+)'/g) || [];
        for (const raw of rawMembers) {
          const memberPath = raw.replace(/['"]/g, '').trim();
          members.push({
            name: path.basename(memberPath),
            relativePath: memberPath.replace(/\\/g, '/'),
            ecosystemId: this.id,
            manifestPath: path.join(memberPath, 'Cargo.toml').replace(/\\/g, '/'),
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

