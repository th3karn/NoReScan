import { ExtensionManifest, defaultLogger } from '@norescan/shared';

export class ExtensionRegistry {
  private extensions: Map<string, ExtensionManifest> = new Map();

  constructor() {
    this.registerBuiltInExtensions();
  }

  private registerBuiltInExtensions(): void {
    const builtIns: ExtensionManifest[] = [
      {
        name: '@norescan/ext-python',
        version: '0.1.0',
        description: 'Advanced Python AST parser, virtualenv detector, and pytest diagnostic healer',
        type: 'analyzer',
        author: 'LostGit Solutions',
        license: 'Apache-2.0',
      },
      {
        name: '@norescan/ext-rust',
        version: '0.1.0',
        description: 'Cargo workspace dependency graph analyzer and rustc error diagnostics',
        type: 'analyzer',
        author: 'LostGit Solutions',
        license: 'Apache-2.0',
      },
      {
        name: '@norescan/ext-cursor-companion',
        version: '0.1.0',
        description: 'Automatic real-time .cursorrules updater and memory injector for Cursor IDE',
        type: 'adapter',
        author: 'LostGit Solutions',
        license: 'Apache-2.0',
      },
      {
        name: '@norescan/ext-bm25-reranker',
        version: '0.1.0',
        description: 'BM25 + TF-IDF multi-vector relevance scoring and token window optimizer',
        type: 'context_strategy',
        author: 'LostGit Solutions',
        license: 'Apache-2.0',
      },
    ];

    for (const ext of builtIns) {
      this.extensions.set(ext.name, ext);
    }
  }

  public registerExtension(manifest: ExtensionManifest): void {
    if (!manifest.name || !manifest.version) {
      throw new Error('Extension manifest requires name and version.');
    }
    this.extensions.set(manifest.name, manifest);
    defaultLogger.info(`Registered marketplace extension: ${manifest.name}@${manifest.version}`);
  }

  public listExtensions(type?: ExtensionManifest['type']): ExtensionManifest[] {
    const all = Array.from(this.extensions.values());
    if (type) {
      return all.filter((e) => e.type === type);
    }
    return all;
  }

  public getExtension(name: string): ExtensionManifest | undefined {
    return this.extensions.get(name);
  }
}
