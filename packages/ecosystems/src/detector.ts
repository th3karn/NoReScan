import fs from 'node:fs/promises';
import path from 'node:path';
import { SupportedLanguage, LanguageStat, MonorepoComponent } from './types.js';

export const EXTENSION_MAP: Record<string, SupportedLanguage> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.pyw': 'python',
  '.rs': 'rust',
  '.go': 'golang',
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hh': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.rake': 'ruby',
  '.swift': 'swift',
  '.m': 'objective-c',
  '.mm': 'objective-c',
  '.dart': 'dart',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hrl': 'erlang',
  '.hs': 'haskell',
  '.lhs': 'haskell',
  '.lua': 'lua',
  '.r': 'r',
  '.jl': 'julia',
  '.pl': 'perl',
  '.pm': 'perl',
  '.zig': 'zig',
  '.scala': 'scala',
  '.sc': 'scala',
  '.clj': 'clojure',
  '.cljs': 'clojure',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.ps1': 'powershell',
  '.psm1': 'powershell',
  '.sql': 'sql',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'css',
  '.sass': 'css',
};

const DISPLAY_NAMES: Record<SupportedLanguage, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  rust: 'Rust',
  golang: 'Go',
  java: 'Java',
  kotlin: 'Kotlin',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  php: 'PHP',
  ruby: 'Ruby',
  swift: 'Swift',
  'objective-c': 'Objective-C',
  dart: 'Dart',
  flutter: 'Flutter',
  elixir: 'Elixir',
  erlang: 'Erlang',
  haskell: 'Haskell',
  lua: 'Lua',
  r: 'R',
  julia: 'Julia',
  perl: 'Perl',
  zig: 'Zig',
  scala: 'Scala',
  clojure: 'Clojure',
  shell: 'Shell Script',
  powershell: 'PowerShell',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
};

export class UniversalLanguageDetector {
  /**
   * Discovers and computes language distributions across the project root.
   */
  public async detectLanguages(
    projectRoot: string,
    fileMap: Map<string, { relativePath: string; fileSize: number; language?: string }>
  ): Promise<LanguageStat[]> {
    const counts = new Map<SupportedLanguage, { files: number; bytes: number }>();
    let totalBytes = 0;

    for (const file of fileMap.values()) {
      let lang: SupportedLanguage | undefined;

      // 1. Check existing language tag or file extension
      if (file.language && file.language in DISPLAY_NAMES) {
        lang = file.language as SupportedLanguage;
      } else {
        const ext = path.extname(file.relativePath).toLowerCase();
        lang = EXTENSION_MAP[ext];
      }

      if (lang) {
        const current = counts.get(lang) || { files: 0, bytes: 0 };
        current.files += 1;
        current.bytes += file.fileSize;
        counts.set(lang, current);
        totalBytes += file.fileSize;
      }
    }

    const results: LanguageStat[] = [];
    for (const [lang, stat] of counts.entries()) {
      const percentage = totalBytes > 0 ? Math.round((stat.bytes / totalBytes) * 1000) / 10 : 0;
      results.push({
        language: lang,
        displayName: DISPLAY_NAMES[lang],
        fileCount: stat.files,
        byteCount: stat.bytes,
        percentage,
        confidence: Math.min(1.0, 0.5 + (stat.files / 20) * 0.5),
        primaryFrameworks: await this.detectFrameworks(projectRoot, lang),
      });
    }

    // Sort descending by bytes
    results.sort((a, b) => b.byteCount - a.byteCount);
    return results;
  }

  /**
   * Detects distinct monorepo components (e.g. Next frontend + Python backend + Go microservice).
   */
  public async detectMonorepoComponents(projectRoot: string): Promise<MonorepoComponent[]> {
    const components: MonorepoComponent[] = [];
    const candidateDirs = ['frontend', 'backend', 'cli', 'apps', 'packages', 'services', 'server', 'client', 'web', 'api'];

    const entries = await fs.readdir(projectRoot, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (['node_modules', '.git', '.bugbrain', 'dist', 'build', '.venv', 'venv'].includes(entry.name)) continue;

      const subPath = path.join(projectRoot, entry.name);

      // Check if candidate dir directly contains a project or holds sub-workspaces
      if (candidateDirs.includes(entry.name) || (await this.hasManifest(subPath))) {
        const comp = await this.inspectComponent(subPath, entry.name);
        if (comp) components.push(comp);

        // If it's a monorepo container directory like apps/ or packages/, inspect children
        if (['apps', 'packages', 'services'].includes(entry.name)) {
          const children = await fs.readdir(subPath, { withFileTypes: true }).catch(() => []);
          for (const child of children) {
            if (child.isDirectory()) {
              const childPath = path.join(subPath, child.name);
              const childComp = await this.inspectComponent(childPath, `${entry.name}/${child.name}`);
              if (childComp) components.push(childComp);
            }
          }
        }
      }
    }

    return components;
  }

  private async hasManifest(dirPath: string): Promise<boolean> {
    const manifests = [
      'package.json',
      'pyproject.toml',
      'requirements.txt',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'build.gradle',
      'build.gradle.kts',
      'composer.json',
      'Gemfile',
      'CMakeLists.txt',
      'Package.swift',
      'pubspec.yaml',
      'mix.exs',
    ];
    for (const m of manifests) {
      try {
        await fs.access(path.join(dirPath, m));
        return true;
      } catch {}
    }
    return false;
  }

  private async inspectComponent(dirPath: string, relativeName: string): Promise<MonorepoComponent | null> {
    const manifestChecks: Array<{
      manifest: string;
      ecosystem: string;
      lang: SupportedLanguage;
    }> = [
      { manifest: 'package.json', ecosystem: 'npm', lang: 'typescript' },
      { manifest: 'pyproject.toml', ecosystem: 'python', lang: 'python' },
      { manifest: 'requirements.txt', ecosystem: 'pip', lang: 'python' },
      { manifest: 'Cargo.toml', ecosystem: 'cargo', lang: 'rust' },
      { manifest: 'go.mod', ecosystem: 'golang', lang: 'golang' },
      { manifest: 'pom.xml', ecosystem: 'maven', lang: 'java' },
      { manifest: 'build.gradle', ecosystem: 'gradle', lang: 'java' },
      { manifest: 'build.gradle.kts', ecosystem: 'gradle', lang: 'kotlin' },
      { manifest: 'composer.json', ecosystem: 'composer', lang: 'php' },
      { manifest: 'Gemfile', ecosystem: 'bundler', lang: 'ruby' },
      { manifest: 'CMakeLists.txt', ecosystem: 'cmake', lang: 'cpp' },
      { manifest: 'Package.swift', ecosystem: 'spm', lang: 'swift' },
      { manifest: 'pubspec.yaml', ecosystem: 'pub', lang: 'dart' },
      { manifest: 'mix.exs', ecosystem: 'mix', lang: 'elixir' },
    ];

    for (const check of manifestChecks) {
      const manifestFile = path.join(dirPath, check.manifest);
      try {
        await fs.access(manifestFile);
        return {
          name: path.basename(relativeName),
          relativePath: relativeName.replace(/\\/g, '/'),
          primaryLanguage: check.lang,
          ecosystemId: check.ecosystem,
          manifestPath: path.join(relativeName, check.manifest).replace(/\\/g, '/'),
        };
      } catch {}
    }

    return null;
  }

  private async detectFrameworks(projectRoot: string, lang: SupportedLanguage): Promise<string[]> {
    const frameworks: string[] = [];

    if (lang === 'typescript' || lang === 'javascript') {
      try {
        const pkg = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps['next']) frameworks.push('Next.js');
        if (allDeps['react']) frameworks.push('React');
        if (allDeps['vue']) frameworks.push('Vue');
        if (allDeps['express']) frameworks.push('Express');
        if (allDeps['fastify']) frameworks.push('Fastify');
        if (allDeps['nestjs'] || allDeps['@nestjs/core']) frameworks.push('NestJS');
        if (allDeps['svelte']) frameworks.push('Svelte');
      } catch {}
    } else if (lang === 'python') {
      try {
        const files = ['pyproject.toml', 'requirements.txt'];
        for (const f of files) {
          const content = await fs.readFile(path.join(projectRoot, f), 'utf8').catch(() => '');
          if (content.includes('fastapi')) frameworks.push('FastAPI');
          if (content.includes('django')) frameworks.push('Django');
          if (content.includes('flask')) frameworks.push('Flask');
          if (content.includes('torch')) frameworks.push('PyTorch');
          if (content.includes('pydantic')) frameworks.push('Pydantic');
        }
      } catch {}
    } else if (lang === 'rust') {
      try {
        const cargo = await fs.readFile(path.join(projectRoot, 'Cargo.toml'), 'utf8');
        if (cargo.includes('tokio')) frameworks.push('Tokio');
        if (cargo.includes('axum')) frameworks.push('Axum');
        if (cargo.includes('actix-web')) frameworks.push('Actix');
        if (cargo.includes('serde')) frameworks.push('Serde');
      } catch {}
    } else if (lang === 'golang') {
      try {
        const mod = await fs.readFile(path.join(projectRoot, 'go.mod'), 'utf8');
        if (mod.includes('gin-gonic/gin')) frameworks.push('Gin');
        if (mod.includes('go-chi/chi')) frameworks.push('Chi');
        if (mod.includes('gofiber/fiber')) frameworks.push('Fiber');
      } catch {}
    }

    return Array.from(new Set(frameworks));
  }
}
