import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EcosystemAdapter,
  SupportedLanguage,
  PackageDependency,
  ProjectCommand,
  WorkspaceMember,
} from '../types.js';

export class DotnetAdapter implements EcosystemAdapter {
  public readonly id = 'dotnet';
  public readonly displayName = '.NET / C# (NuGet / dotnet CLI)';
  public readonly supportedLanguages: SupportedLanguage[] = ['csharp'];
  public readonly manifestFiles = ['*.csproj', '*.fsproj', '*.sln', 'Directory.Build.props'];
  public readonly lockFiles = ['packages.lock.json'];

  public async detect(projectRoot: string): Promise<boolean> {
    const files = await fs.readdir(projectRoot).catch(() => []);
    return files.some((f) => f.endsWith('.csproj') || f.endsWith('.sln') || f.endsWith('.fsproj'));
  }

  public async extractDependencies(projectRoot: string): Promise<PackageDependency[]> {
    const deps: PackageDependency[] = [];
    const files = await fs.readdir(projectRoot).catch(() => []);
    const projFiles = files.filter((f) => f.endsWith('.csproj'));

    for (const pf of projFiles) {
      try {
        const content = await fs.readFile(path.join(projectRoot, pf), 'utf8');
        const refRegex = /<PackageReference\s+Include=["']([^"']+)["']\s+Version=["']([^"']+)["']/g;
        let match;
        while ((match = refRegex.exec(content)) !== null) {
          deps.push({
            name: match[1],
            declaredVersion: match[2],
            versionConstraint: match[2],
            dependencyType: 'production',
            isDirect: true,
            isOptional: false,
            manifestPath: pf,
            registry: 'nuget.org',
          });
        }
      } catch {}
    }

    return deps;
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    return [
      {
        name: 'dotnet-build',
        rawCommand: 'dotnet build',
        category: 'build',
        sourceFile: '*.csproj',
        workingDir: '.',
        description: 'Build .NET project and dependencies',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'dotnet-test',
        rawCommand: 'dotnet test',
        category: 'test',
        sourceFile: '*.csproj',
        workingDir: '.',
        description: 'Execute unit tests using VSTest / xUnit / NUnit',
        safeToRun: true,
        requiresNetwork: false,
        ecosystemId: this.id,
      },
      {
        name: 'dotnet-restore',
        rawCommand: 'dotnet restore',
        category: 'install',
        sourceFile: '*.csproj',
        workingDir: '.',
        description: 'Restore NuGet package dependencies',
        safeToRun: true,
        requiresNetwork: true,
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

