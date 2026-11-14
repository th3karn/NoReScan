import { describe, it, expect, beforeEach } from 'vitest';
import {
  NoReScanDatabase,
  DatabaseMigrator,
  FileRepository,
  AnalysisRepository,
  DependencyRepository,
  DecisionRepository,
  ProjectRepository,
} from '@norescan/database';
import { TaskContextEngine, extractQueryTokens } from '../src/index.js';

describe('TaskContextEngine', () => {
  let db: NoReScanDatabase;
  let engine: TaskContextEngine;

  beforeEach(() => {
    db = new NoReScanDatabase({ filename: ':memory:' });
    new DatabaseMigrator(db).migrate();

    const projectRepo = new ProjectRepository(db);
    projectRepo.upsert({
      id: 'proj-1',
      rootPath: 'C:/repos/test-app',
      name: 'test-app',
      configHash: 'hash-config',
      syncEnabled: false,
    });

    const fileRepo = new FileRepository(db);
    const analysisRepo = new AnalysisRepository(db);
    const depRepo = new DependencyRepository(db);
    const decisionRepo = new DecisionRepository(db);

    // 1. Add auth files
    const authService = fileRepo.upsertFile({
      projectId: 'proj-1',
      relativePath: 'src/auth/auth.service.ts',
      contentHash: 'hash-auth-srv',
      language: 'typescript',
      fileSize: 1500,
      status: 'valid',
      lastScannedAt: new Date().toISOString(),
    });

    analysisRepo.saveAnalysis({
      fileId: authService.id,
      contentHash: 'hash-auth-srv',
      summary: 'Authentication service handling JWT tokens and user validation',
      astMetadata: {
        symbols: [{ name: 'AuthService', kind: 'class', line: 10, exported: true }],
        imports: [],
        exports: [{ name: 'AuthService', kind: 'class' }],
      },
      analyzerVersion: '1.0.0',
      schemaVersion: 1,
      status: 'valid',
    });

    // 2. Add auth controller
    const authController = fileRepo.upsertFile({
      projectId: 'proj-1',
      relativePath: 'src/auth/auth.controller.ts',
      contentHash: 'hash-auth-ctrl',
      language: 'typescript',
      fileSize: 2000,
      status: 'valid',
      lastScannedAt: new Date().toISOString(),
    });

    analysisRepo.saveAnalysis({
      fileId: authController.id,
      contentHash: 'hash-auth-ctrl',
      summary: 'Auth REST endpoints',
      astMetadata: {
        symbols: [{ name: 'AuthController', kind: 'class', line: 5, exported: true }],
        imports: [{ source: './auth.service', specifiers: ['AuthService'] }],
        exports: [{ name: 'AuthController', kind: 'class' }],
        routes: [{ method: 'POST', path: '/api/auth/login', handler: 'login' }],
      },
      analyzerVersion: '1.0.0',
      schemaVersion: 1,
      status: 'valid',
    });

    // 3. Add unrelated payment file
    const paymentService = fileRepo.upsertFile({
      projectId: 'proj-1',
      relativePath: 'src/payment/stripe.ts',
      contentHash: 'hash-stripe',
      language: 'typescript',
      fileSize: 3000,
      status: 'valid',
      lastScannedAt: new Date().toISOString(),
    });

    analysisRepo.saveAnalysis({
      fileId: paymentService.id,
      contentHash: 'hash-stripe',
      summary: 'Stripe payment processor',
      astMetadata: {
        symbols: [{ name: 'StripeProcessor', kind: 'class', line: 1, exported: true }],
        imports: [],
        exports: [{ name: 'StripeProcessor', kind: 'class' }],
      },
      analyzerVersion: '1.0.0',
      schemaVersion: 1,
      status: 'valid',
    });

    // Add decision
    decisionRepo.recordDecision({
      projectId: 'proj-1',
      title: 'JWT Refresh Rotation',
      decision: 'Rotate refresh token on each exchange',
      rationale: 'Prevent replay attacks',
      affectedFiles: ['src/auth/auth.service.ts'],
    });

    engine = new TaskContextEngine({
      projectId: 'proj-1',
      projectRoot: 'C:/repos/test-app',
      fileRepo,
      analysisRepo,
      depRepo,
      decisionRepo,
    });
  });

  it('tokenizes task queries accurately', () => {
    const tokens = extractQueryTokens('Refactor the userAuthService and add JWT token refresh');
    expect(tokens).toContain('user');
    expect(tokens).toContain('auth');
    expect(tokens).toContain('service');
    expect(tokens).toContain('jwt');
    expect(tokens).toContain('token');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('and');
  });

  it('retrieves relevant files while excluding irrelevant files', () => {
    const manifest = engine.getContext('Update the authentication service and JWT tokens');

    const relevantPaths = manifest.files.map((f) => f.relativePath);
    expect(relevantPaths).toContain('src/auth/auth.service.ts');
    expect(relevantPaths).toContain('src/auth/auth.controller.ts');
    expect(relevantPaths).not.toContain('src/payment/stripe.ts');

    expect(manifest.decisions).toHaveLength(1);
    expect(manifest.decisions[0].title).toBe('JWT Refresh Rotation');
  });

  it('formats context as Markdown with safety directives', () => {
    const markdown = engine.getContextMarkdown('Fix authentication login');
    expect(markdown).toContain('# norescan Context Manifest');
    expect(markdown).toContain('file:///C:/repos/test-app/src/auth/auth.controller.ts');
    expect(markdown).toContain('Always read physical source files before writing modifications');
  });
});

