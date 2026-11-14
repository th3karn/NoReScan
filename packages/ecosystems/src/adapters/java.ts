import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EcosystemAdapter,
  SupportedLanguage,
  PackageDependency,
  ProjectCommand,
  WorkspaceMember,
} from '../types.js';

export class JavaAdapter implements EcosystemAdapter {
  public readonly id = 'jvm';
  public readonly displayName = 'Java & Kotlin (Maven / Gradle)';
  public readonly supportedLanguages: SupportedLanguage[] = ['java', 'kotlin'];
  public readonly manifestFiles = ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts'];
  public readonly lockFiles = ['gradle.lockfile'];

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

    // 1. Check pom.xml (Maven)
    try {
      const pomContent = await fs.readFile(path.join(projectRoot, 'pom.xml'), 'utf8');
      const depRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
      let match;
      while ((match = depRegex.exec(pomContent)) !== null) {
        const inner = match[1];
        const group = inner.match(/<groupId>([^<]+)<\/groupId>/)?.[1] || '';
        const artifact = inner.match(/<artifactId>([^<]+)<\/artifactId>/)?.[1] || '';
        const version = inner.match(/<version>([^<]+)<\/version>/)?.[1] || 'managed';
        const scope = inner.match(/<scope>([^<]+)<\/scope>/)?.[1] || 'compile';

        if (group && artifact) {
          deps.push({
            name: `${group}:${artifact}`,
            declaredVersion: version,
            versionConstraint: version,
            dependencyType: scope === 'test' ? 'development' : 'production',
            isDirect: true,
            isOptional: false,
            manifestPath: 'pom.xml',
            registry: 'repo.maven.apache.org',
          });
        }
      }
    } catch {}

    // 2. Check build.gradle or build.gradle.kts
    for (const gf of ['build.gradle', 'build.gradle.kts']) {
      try {
        const content = await fs.readFile(path.join(projectRoot, gf), 'utf8');
        const gradleDepRegex = /(implementation|testImplementation|api|compileOnly)\s*\(?['"]([^'"]+)['"]\)?/g;
        let match;
        while ((match = gradleDepRegex.exec(content)) !== null) {
          const type = match[1];
          const coord = match[2];
          const parts = coord.split(':');
          deps.push({
            name: parts.length >= 2 ? `${parts[0]}:${parts[1]}` : coord,
            declaredVersion: parts[2] || 'latest',
            versionConstraint: parts[2] || 'latest',
            dependencyType: type.includes('test') ? 'development' : 'production',
            isDirect: true,
            isOptional: false,
            manifestPath: gf,
            registry: 'repo.maven.apache.org',
          });
        }
      } catch {}
    }

    return deps;
  }

  public async extractCommands(projectRoot: string): Promise<ProjectCommand[]> {
    let hasMvnw = false;
    let hasPom = false;
    let hasGradlew = false;
    let hasGradle = false;

    const isWindows = process.platform === 'win32';

    try { await fs.access(path.join(projectRoot, isWindows ? 'mvnw.cmd' : 'mvnw')); hasMvnw = true; } catch {}
    try { await fs.access(path.join(projectRoot, 'pom.xml')); hasPom = true; } catch {}
    try { await fs.access(path.join(projectRoot, isWindows ? 'gradlew.bat' : 'gradlew')); hasGradlew = true; } catch {}
    try { await fs.access(path.join(projectRoot, 'build.gradle')); hasGradle = true; } catch {}
    try { await fs.access(path.join(projectRoot, 'build.gradle.kts')); hasGradle = true; } catch {}

    const commands: ProjectCommand[] = [];

    if (hasPom) {
      const mvnBin = hasMvnw ? (isWindows ? '.\\mvnw.cmd' : './mvnw') : 'mvn';
      commands.push(
        {
          name: 'mvn-test',
          rawCommand: `${mvnBin} test`,
          category: 'test',
          sourceFile: 'pom.xml',
          workingDir: '.',
          description: 'Run JUnit / TestNG test suites via Maven',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        },
        {
          name: 'mvn-package',
          rawCommand: `${mvnBin} package -DskipTests`,
          category: 'build',
          sourceFile: 'pom.xml',
          workingDir: '.',
          description: 'Compile and build target JAR/WAR artifact',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        },
        {
          name: 'mvn-tree',
          rawCommand: `${mvnBin} dependency:tree`,
          category: 'diagnostics',
          sourceFile: 'pom.xml',
          workingDir: '.',
          description: 'Display complete Maven dependency hierarchy',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        }
      );
    } else if (hasGradle) {
      const gradBin = hasGradlew ? (isWindows ? '.\\gradlew.bat' : './gradlew') : 'gradle';
      commands.push(
        {
          name: 'gradle-test',
          rawCommand: `${gradBin} test`,
          category: 'test',
          sourceFile: 'build.gradle',
          workingDir: '.',
          description: 'Run test suite via Gradle',
          safeToRun: true,
          requiresNetwork: false,
          ecosystemId: this.id,
        },
        {
          name: 'gradle-build',
          rawCommand: `${gradBin} build -x test`,
          category: 'build',
          sourceFile: 'build.gradle',
          workingDir: '.',
          description: 'Build project binaries via Gradle',
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
