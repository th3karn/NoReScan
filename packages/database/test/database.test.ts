import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CodeCacheDatabase,
  DatabaseMigrator,
  ProjectRepository,
  FileRepository,
  AnalysisRepository,
  DependencyRepository,
  DecisionRepository,
  SessionRepository,
} from '../src/index.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

describe('CodeCacheDatabase & Repositories', () => {
  let db: CodeCacheDatabase;
  let migrator: DatabaseMigrator;

  beforeEach(() => {
    db = new CodeCacheDatabase({ filename: ':memory:' });
    migrator = new DatabaseMigrator(db);
    migrator.migrate();
  });

  afterEach(() => {
    db.close();
  });

  it('runs migrations and creates core tables', () => {
    const tables = db.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('files');
    expect(tableNames).toContain('file_versions');
    expect(tableNames).toContain('analyses');
    expect(tableNames).toContain('dependencies');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('tasks');
    expect(tableNames).toContain('decisions');
    expect(tableNames).toContain('schema_migrations');
  });

  it('manages projects correctly', () => {
    const projectRepo = new ProjectRepository(db);
    const created = projectRepo.upsert({
      id: 'p-1',
      rootPath: 'C:/repos/test',
      name: 'test',
      configHash: 'hash-123',
      syncEnabled: false,
    });

    expect(created.id).toBe('p-1');
    expect(created.name).toBe('test');

    const fetched = projectRepo.getById('p-1');
    expect(fetched?.rootPath).toBe('C:/repos/test');
  });

  it('manages file snapshots, versions, and statuses', () => {
    const projectRepo = new ProjectRepository(db);
    projectRepo.upsert({
      id: 'p-1',
      rootPath: 'C:/repos/test',
      name: 'test',
      configHash: 'hash-123',
      syncEnabled: false,
    });

    const fileRepo = new FileRepository(db);
    const snap = fileRepo.upsertFile({
      projectId: 'p-1',
      relativePath: 'src/auth/service.ts',
      contentHash: 'hash-sha256-1',
      language: 'typescript',
      fileSize: 1024,
      status: 'valid',
      lastScannedAt: new Date().toISOString(),
    });

    expect(snap.relativePath).toBe('src/auth/service.ts');

    const files = fileRepo.getAllByProject('p-1');
    expect(files.size).toBe(1);
    expect(files.get('src/auth/service.ts')?.contentHash).toBe('hash-sha256-1');

    fileRepo.updateStatus(snap.id, 'stale');
    const updatedFiles = fileRepo.getAllByProject('p-1');
    expect(updatedFiles.get('src/auth/service.ts')?.status).toBe('stale');
  });

  it('records analyses and dependencies', () => {
    const projectRepo = new ProjectRepository(db);
    projectRepo.upsert({
      id: 'p-1',
      rootPath: 'C:/repos/test',
      name: 'test',
      configHash: 'hash-123',
      syncEnabled: false,
    });

    const fileRepo = new FileRepository(db);
    const file1 = fileRepo.upsertFile({
      projectId: 'p-1',
      relativePath: 'src/app.ts',
      contentHash: 'hash-1',
      language: 'typescript',
      fileSize: 500,
      status: 'valid',
      lastScannedAt: new Date().toISOString(),
    });

    const file2 = fileRepo.upsertFile({
      projectId: 'p-1',
      relativePath: 'src/utils.ts',
      contentHash: 'hash-2',
      language: 'typescript',
      fileSize: 300,
      status: 'valid',
      lastScannedAt: new Date().toISOString(),
    });

    const analysisRepo = new AnalysisRepository(db);
    analysisRepo.saveAnalysis({
      fileId: file1.id,
      contentHash: 'hash-1',
      summary: 'Main application bootstrap',
      astMetadata: {
        symbols: [{ name: 'main', kind: 'function', line: 10, exported: true }],
        imports: [{ source: './utils', specifiers: ['helper'], isDynamic: false, isTypeOnly: false }],
        exports: [{ name: 'main', kind: 'function' }],
      },
      analyzerVersion: '1.0.0',
      schemaVersion: 1,
      status: 'valid',
    });

    const latest = analysisRepo.getLatestByFileId(file1.id);
    expect(latest?.summary).toBe('Main application bootstrap');
    expect(latest?.astMetadata.exports[0].name).toBe('main');

    const depRepo = new DependencyRepository(db);
    depRepo.replaceFileDependencies('p-1', file1.id, [
      {
        targetPath: './utils',
        targetFileId: file2.id,
        dependencyType: 'import',
        confidence: 1.0,
      },
    ]);

    const upstream = depRepo.getUpstreamDependencies(file1.id);
    expect(upstream).toHaveLength(1);
    expect(upstream[0].targetPath).toBe('./utils');

    const downstream = depRepo.getDownstreamDependents(file2.id);
    expect(downstream).toHaveLength(1);
    expect(downstream[0].sourceFileId).toBe(file1.id);
  });

  it('records decisions and agent sessions', () => {
    const projectRepo = new ProjectRepository(db);
    projectRepo.upsert({
      id: 'p-1',
      rootPath: 'C:/repos/test',
      name: 'test',
      configHash: 'hash-123',
      syncEnabled: false,
    });

    const sessionRepo = new SessionRepository(db);
    const session = sessionRepo.startSession('p-1', 'antigravity', { prompt: 'Setup auth' });
    expect(session.agentName).toBe('antigravity');

    const decisionRepo = new DecisionRepository(db);
    decisionRepo.recordDecision({
      projectId: 'p-1',
      sessionId: session.id,
      title: 'Use JWT with rotating refresh tokens',
      rationale: 'Security requirement',
      decision: 'Implemented token pair with 15m expiration',
      affectedFiles: ['src/auth/jwt.ts'],
    });

    const decisions = decisionRepo.listByProject('p-1');
    expect(decisions).toHaveLength(1);
    expect(decisions[0].title).toBe('Use JWT with rotating refresh tokens');

    sessionRepo.endSession(session.id, 'Authentication successfully configured');
    const latest = sessionRepo.getLatest('p-1');
    expect(latest?.summary).toBe('Authentication successfully configured');
  });

  it('persists data across database restarts on physical disk', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-cache-db-test-'));
    const dbFile = path.join(tempDir, 'memory.db');

    // Step 1: Open, migrate, insert
    const db1 = new CodeCacheDatabase({ filename: dbFile });
    new DatabaseMigrator(db1).migrate();
    new ProjectRepository(db1).upsert({
      id: 'disk-proj-1',
      rootPath: 'E:/my-repo',
      name: 'my-repo',
      configHash: 'hash-disk',
      syncEnabled: false,
    });
    db1.close();

    // Step 2: Reopen same database file and verify data survived restart
    const db2 = new CodeCacheDatabase({ filename: dbFile });
    const fetched = new ProjectRepository(db2).getById('disk-proj-1');
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('my-repo');
    db2.close();

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});

