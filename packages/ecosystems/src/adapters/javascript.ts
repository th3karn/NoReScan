import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EcosystemAdapter,
  SupportedLanguage,
  PackageDependency,
  ProjectCommand,
  WorkspaceMember,
  CommandCategory,
} from '../types.js';

export class JavaScriptAdapter implements EcosystemAdapter {
  public readonly id = 'javascript';
  public readonly displayName = 'Node.js / JavaScript / TypeScript';
  public readonly supportedLanguages: SupportedLanguage[] = ['javascript', 'typescript'];
  public readonly manifestFiles = ['package.json'];
  public readonly lockFiles = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];

  public async detect(projectRoot: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectRoot, 'package.json'));
      return true;
    } catch {
      return false;
    }
  }

  public async extractDependencies(projectRoot: string): Promise<PackageDependency[]> {
    const manifestPath = path.join(projectRoot, 'package.json');
    const deps: PackageDependency[] = [];

    try {
      const content = await fs.readFile(manifestPath, 'utf8');
      const pkg = JSON.parse(content);

      const addGroup = (group: Record<string, string> | undefined, type: PackageDependency['dependencyType']) => {
        if (!group) return;
        for (const [name, version] of Object.entries(group)) {
          deps.push({
            name,
            declaredVersion: String(version),
            versionConstraint: String(version),
            dependencyType: type,
            isDirect: true,
            isOptional: type === 'optional',
            manifestPath: 'package.json',
            registry: 'npm',
          });
        }
      };

      addGroup(pkg.dependencies, 'production');
      addGroup(pkg.devDependencies, 'development');
      addGroup(pkg.peerDependencies, 'peer');
      addGroup(pkg.optionalDependencies, 'optional');
    } catch {}

    return deps;
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    const manifestPath = path.join(projectRoot, 'package.json');
    const commands: ProjectCommand[] = [];

    try {
      const content = await fs.readFile(manifestPath, 'utf8');
      const pkg = JSON.parse(content);
      const scripts = pkg.scripts || {};

      // Detect preferred package manager
      let pm = 'npm run';
      try {
        await fs.access(path.join(projectRoot, 'pnpm-lock.yaml'));
        pm = 'pnpm';
      } catch {
        try {
          await fs.access(path.join(projectRoot, 'yarn.lock'));
          pm = 'yarn';
        } catch {
          try {
            await fs.access(path.join(projectRoot, 'bun.lockb'));
            pm = 'bun run';
          } catch {}
        }
      }

      for (const [name, script] of Object.entries(scripts)) {
        const raw = String(script);
        commands.push({
          name: `${pm === 'pnpm' || pm === 'yarn' ? pm : `${pm} `}${name}`,
          rawCommand: raw,
          category: this.classifyScript(name, raw),
          sourceFile: 'package.json',
          workingDir: '.',
          description: `npm script: "${name}"`,
          safeToRun: !raw.includes('rm -rf') && !raw.includes('drop table'),
          requiresNetwork: raw.includes('install') || raw.includes('publish') || raw.includes('deploy'),
          ecosystemId: this.id,
        });
      }
    } catch {}

    return commands;
  }

  public async detectWorkspaces(projectRoot: string): Promise<WorkspaceMember[]> {
    const members: WorkspaceMember[] = [];

    // 1. Check pnpm-workspace.yaml
    try {
      const pnpmWs = await fs.readFile(path.join(projectRoot, 'pnpm-workspace.yaml'), 'utf8');
      const lines = pnpmWs.split('\n');
      for (const line of lines) {
        const match = line.match(/-\s*["']?([^"']+)["']?/);
        if (match) {
          const pattern = match[1].replace('/*', '').trim();
          const targetDir = path.join(projectRoot, pattern);
          try {
            const entries = await fs.readdir(targetDir, { withFileTypes: true });
            for (const ent of entries) {
              if (ent.isDirectory()) {
                const pkgPath = path.join(targetDir, ent.name, 'package.json');
                try {
                  const pkgContent = await fs.readFile(pkgPath, 'utf8');
                  const parsed = JSON.parse(pkgContent);
                  members.push({
                    name: parsed.name || ent.name,
                    relativePath: path.join(pattern, ent.name).replace(/\\/g, '/'),
                    ecosystemId: this.id,
                    manifestPath: path.join(pattern, ent.name, 'package.json').replace(/\\/g, '/'),
                    dependencies: Object.keys(parsed.dependencies || {}),
                  });
                } catch {}
              }
            }
          } catch {}
        }
      }
    } catch {}

    return members;
  }

  public async suggestCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return [
      {
        name: 'install',
        rawCommand: 'pnpm install',
        category: 'install',
        sourceFile: 'package.json',
        workingDir: '.',
        description: 'Install repository dependencies',
        safeToRun: true,
        requiresNetwork: true,
        ecosystemId: this.id,
      },
      {
        name: 'test',
        rawCommand: 'pnpm test',
        category: 'test',
        sourceFile: 'package.json',
        workingDir: '.',
        description: 'Run project unit and integration tests',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'build',
        rawCommand: 'pnpm run build',
        category: 'build',
        sourceFile: 'package.json',
        workingDir: '.',
        description: 'Compile packages and bundle application',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
    ];
  }

  private classifyScript(name: string, raw: string): CommandCategory {
    const n = name.toLowerCase();
    const r = raw.toLowerCase();

    if (n.includes('test') || n.includes('spec') || r.includes('jest') || r.includes('vitest') || r.includes('mocha')) return 'test';
    if (n.includes('build') || n.includes('compile') || r.includes('tsc') || r.includes('webpack') || r.includes('esbuild')) return 'build';
    if (n.includes('start') || n.includes('serve')) return 'start';
    if (n.includes('dev') || n.includes('watch')) return 'development';
    if (n.includes('lint') || r.includes('eslint')) return 'lint';
    if (n.includes('format') || r.includes('prettier')) return 'format';
    if (n.includes('typecheck')) return 'typecheck';
    if (n.includes('clean')) return 'cleanup';
    if (n.includes('deploy')) return 'deploy';
    if (n.includes('migrate') || r.includes('prisma') || r.includes('drizzle')) return 'migration';

    return 'run';
  }
}

