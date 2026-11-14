import { EcosystemAdapter, PackageDependency, ProjectCommand, WorkspaceMember } from './types.js';
import { JavaScriptAdapter } from './adapters/javascript.js';
import { PythonAdapter } from './adapters/python.js';
import { RustAdapter } from './adapters/rust.js';
import { GoAdapter } from './adapters/golang.js';
import { JavaAdapter } from './adapters/java.js';
import { DotnetAdapter } from './adapters/dotnet.js';
import { PhpAdapter } from './adapters/php.js';
import { RubyAdapter } from './adapters/ruby.js';
import { DartAdapter } from './adapters/dart.js';
import { CppAdapter } from './adapters/cpp.js';
import { SwiftAdapter, ElixirAdapter, ZigAdapter } from './adapters/polyglot.js';

export class EcosystemRegistry {
  private adapters: Map<string, EcosystemAdapter> = new Map();

  constructor() {
    this.register(new JavaScriptAdapter());
    this.register(new PythonAdapter());
    this.register(new RustAdapter());
    this.register(new GoAdapter());
    this.register(new JavaAdapter());
    this.register(new DotnetAdapter());
    this.register(new PhpAdapter());
    this.register(new RubyAdapter());
    this.register(new DartAdapter());
    this.register(new CppAdapter());
    this.register(new SwiftAdapter());
    this.register(new ElixirAdapter());
    this.register(new ZigAdapter());
  }

  public register(adapter: EcosystemAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id: string): EcosystemAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAllAdapters(): EcosystemAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Discovers which ecosystems are active in this repository based on manifests and files.
   */
  public async detectActiveEcosystems(projectRoot: string): Promise<EcosystemAdapter[]> {
    const active: EcosystemAdapter[] = [];
    for (const adapter of this.adapters.values()) {
      try {
        if (await adapter.detect(projectRoot)) {
          active.push(adapter);
        }
      } catch {}
    }
    return active;
  }

  /**
   * Aggregates all package dependencies declared across all active ecosystems.
   */
  public async extractAllDependencies(projectRoot: string): Promise<PackageDependency[]> {
    const active = await this.detectActiveEcosystems(projectRoot);
    const results: PackageDependency[] = [];
    for (const adapter of active) {
      try {
        const deps = await adapter.extractDependencies(projectRoot);
        results.push(...deps);
      } catch {}
    }
    return results;
  }

  /**
   * Aggregates all project commands discovered from manifests and configurations.
   */
  public async extractAllCommands(projectRoot: string): Promise<ProjectCommand[]> {
    const active = await this.detectActiveEcosystems(projectRoot);
    const results: ProjectCommand[] = [];
    for (const adapter of active) {
      try {
        const cmds = await adapter.extractCommands(projectRoot);
        results.push(...cmds);
      } catch {}
    }
    return results;
  }

  /**
   * Discovers monorepo workspaces across active ecosystems.
   */
  public async detectAllWorkspaces(projectRoot: string): Promise<WorkspaceMember[]> {
    const active = await this.detectActiveEcosystems(projectRoot);
    const results: WorkspaceMember[] = [];
    for (const adapter of active) {
      try {
        const members = await adapter.detectWorkspaces(projectRoot);
        results.push(...members);
      } catch {}
    }
    return results;
  }
}

