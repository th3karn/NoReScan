import { z } from 'zod';

export type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'rust'
  | 'golang'
  | 'java'
  | 'kotlin'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'objective-c'
  | 'dart'
  | 'flutter'
  | 'elixir'
  | 'erlang'
  | 'haskell'
  | 'lua'
  | 'r'
  | 'julia'
  | 'perl'
  | 'zig'
  | 'scala'
  | 'clojure'
  | 'shell'
  | 'powershell'
  | 'sql'
  | 'html'
  | 'css';

export interface LanguageStat {
  language: SupportedLanguage;
  displayName: string;
  fileCount: number;
  byteCount: number;
  percentage: number;
  confidence: number;
  primaryFrameworks: string[];
}

export interface MonorepoComponent {
  name: string;
  relativePath: string;
  primaryLanguage: SupportedLanguage;
  ecosystemId: string;
  manifestPath: string;
  description?: string;
}

export type DependencyCategory =
  | 'production'
  | 'development'
  | 'peer'
  | 'optional'
  | 'build'
  | 'runtime'
  | 'system';

export interface PackageDependency {
  name: string;
  declaredVersion: string;
  resolvedVersion?: string;
  versionConstraint?: string;
  dependencyType: DependencyCategory;
  isDirect: boolean;
  isOptional: boolean;
  registry?: string;
  manifestPath: string;
  platformCondition?: string;
  parent?: string;
}

export type CommandCategory =
  | 'install'
  | 'setup'
  | 'environment'
  | 'build'
  | 'development'
  | 'start'
  | 'run'
  | 'test'
  | 'lint'
  | 'format'
  | 'typecheck'
  | 'deploy'
  | 'migration'
  | 'cleanup'
  | 'diagnostics';

export interface ProjectCommand {
  name: string;
  rawCommand: string;
  category: CommandCategory;
  sourceFile: string;
  workingDir: string;
  description?: string;
  safeToRun: boolean;
  requiresNetwork: boolean;
  ecosystemId: string;
}

export interface RuntimeEnvironment {
  tool: string;
  displayName: string;
  installed: boolean;
  detectedVersion?: string;
  requiredVersion?: string;
  executablePath?: string;
  compatible: boolean;
  ecosystemId: string;
  notes?: string;
}

export interface WorkspaceMember {
  name: string;
  relativePath: string;
  ecosystemId: string;
  manifestPath: string;
  dependencies: string[];
}

export interface EcosystemMetadata {
  id: string;
  displayName: string;
  supportedLanguages: SupportedLanguage[];
  manifestFiles: string[];
  lockFiles: string[];
  configFiles: string[];
}

export interface EcosystemAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly supportedLanguages: SupportedLanguage[];
  readonly manifestFiles: string[];
  readonly lockFiles: string[];

  detect(projectRoot: string): Promise<boolean>;
  extractDependencies(projectRoot: string): Promise<PackageDependency[]>;
  extractCommands(projectRoot: string): Promise<ProjectCommand[]>;
  detectWorkspaces(projectRoot: string): Promise<WorkspaceMember[]>;
  suggestCommands(projectRoot: string): Promise<ProjectCommand[]>;
  checkEnvironment?(projectRoot: string): Promise<RuntimeEnvironment[]>;
}
