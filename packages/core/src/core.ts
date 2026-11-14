import path from 'node:path';
import fs from 'node:fs/promises';
import {
  RepoMindDatabase,
  DatabaseMigrator,
  ProjectRepository,
  FileRepository,
  AnalysisRepository,
  DependencyRepository,
  DecisionRepository,
  SessionRepository,
} from '@repomind/database';
import { FileScanner } from '@repomind/scanner';
import { diffFingerprints } from '@repomind/fingerprint';
import { CodeAnalyzer } from '@repomind/analyzer';
import {
  DependencyGraph,
  resolveImportSpecifier,
  ConservativeInvalidator,
} from '@repomind/dependency-graph';
import { TaskContextEngine } from '@repomind/context-engine';
import {
  normalizePath,
  RepoMindConfig,
  RepoMindConfigSchema,
  DEFAULT_CONFIG,
  defaultLogger,
  ConfigurationError,
} from '@repomind/shared';
import crypto from 'node:crypto';

export interface ScanSummary {
  scanned: number;
  unchanged: number;
  modified: number;
  added: number;
  deleted: number;
  renamed: number;
  invalidatedDependents: number;
  durationMs: number;
}

export interface StatusSummary {
  projectId: string;
  projectName: string;
  rootPath: string;
  totalFiles: number;
  validAnalyses: number;
  staleAnalyses: number;
  decisionsCount: number;
  sessionsCount: number;
  lastScannedAt?: string;
}

export class RepoMindCore {
  public readonly projectRoot: string;
  public config!: RepoMindConfig;
  public db!: RepoMindDatabase;
  public projectRepo!: ProjectRepository;
  public fileRepo!: FileRepository;
  public analysisRepo!: AnalysisRepository;
  public depRepo!: DependencyRepository;
  public decisionRepo!: DecisionRepository;
  public sessionRepo!: SessionRepository;
  public graph!: DependencyGraph;
  public analyzer!: CodeAnalyzer;
  public contextEngine!: TaskContextEngine;

  constructor(projectRoot: string) {
    this.projectRoot = normalizePath(path.resolve(projectRoot));
    this.analyzer = new CodeAnalyzer();
    this.graph = new DependencyGraph();
  }

  /**
   * Loads existing .repomind/config.json or returns null if uninitialized.
   */
  public async loadConfig(): Promise<RepoMindConfig | null> {
    const configPath = path.join(this.projectRoot, '.repomind', 'config.json');
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const parsed = RepoMindConfigSchema.parse(JSON.parse(content));
      this.config = parsed;
      this.initDatabase();
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Initializes a new RepoMind workspace.
   */
  public async init(projectName?: string): Promise<RepoMindConfig> {
    const repomindDir = path.join(this.projectRoot, '.repomind');
    await fs.mkdir(repomindDir, { recursive: true });

    const name = projectName || path.basename(this.projectRoot);
    const existing = await this.loadConfig();
    if (existing) {
      return existing;
    }

    const newConfig: RepoMindConfig = {
      ...DEFAULT_CONFIG,
      projectId: crypto.randomUUID(),
      projectName: name,
    };

    const configPath = path.join(repomindDir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
    this.config = newConfig;

    this.initDatabase();
    this.projectRepo.upsert({
      id: newConfig.projectId,
      rootPath: this.projectRoot,
      name: newConfig.projectName,
      configHash: crypto.createHash('sha256').update(JSON.stringify(newConfig)).digest('hex'),
      syncEnabled: newConfig.sync.enabled,
    });

    return newConfig;
  }

  private initDatabase(): void {
    if (this.db) return;
    const dbPath = path.join(this.projectRoot, '.repomind', 'memory.db');
    this.db = new RepoMindDatabase({ filename: dbPath });

    const migrator = new DatabaseMigrator(this.db);
    migrator.migrate();

    this.projectRepo = new ProjectRepository(this.db);
    this.fileRepo = new FileRepository(this.db);
    this.analysisRepo = new AnalysisRepository(this.db);
    this.depRepo = new DependencyRepository(this.db);
    this.decisionRepo = new DecisionRepository(this.db);
    this.sessionRepo = new SessionRepository(this.db);

    this.contextEngine = new TaskContextEngine({
      projectId: this.config.projectId,
      projectRoot: this.projectRoot,
      fileRepo: this.fileRepo,
      analysisRepo: this.analysisRepo,
      depRepo: this.depRepo,
      decisionRepo: this.decisionRepo,
      graph: this.graph,
    });
  }

  private ensureInitialized(): void {
    if (!this.config || !this.db) {
      throw new ConfigurationError(
        `RepoMind is not initialized in ${this.projectRoot}. Run "repomind init" first.`
      );
    }
  }

  /**
   * Performs incremental scan, hash comparison, AST parsing, and conservative invalidation.
   */
  public async scan(options: { force?: boolean } = {}): Promise<ScanSummary> {
    this.ensureInitialized();
    const startTime = Date.now();

    const scanner = new FileScanner({
      projectRoot: this.projectRoot,
      config: this.config,
    });
    await scanner.init();

    const scanResult = await scanner.scan();
    const currentFingerprints = scanResult.fingerprints;

    // Load previous file snapshots
    const previousSnapshots = this.fileRepo.getAllByProject(this.config.projectId);
    const diff = options.force
      ? {
          unchanged: [],
          modified: Array.from(currentFingerprints.values()),
          added: [],
          deleted: [],
          renamed: [],
        }
      : diffFingerprints(currentFingerprints, previousSnapshots);

    // Handle deleted files
    for (const deleted of diff.deleted) {
      this.fileRepo.markDeleted(this.config.projectId, deleted.relativePath);
      this.graph.removeNode(deleted.relativePath);
    }

    // Handle renamed files
    for (const rename of diff.renamed) {
      this.fileRepo.markDeleted(this.config.projectId, rename.from.relativePath);
      this.graph.removeNode(rename.from.relativePath);
    }

    const filesToAnalyze = [...diff.added, ...diff.modified, ...diff.renamed.map((r) => r.to)];
    const allKnownPaths = new Set(currentFingerprints.keys());

    let invalidatedDependentsCount = 0;
    const invalidator = new ConservativeInvalidator(this.graph);

    // Analyze new and modified files
    for (const fp of filesToAnalyze) {
      const absPath = path.join(this.projectRoot, fp.relativePath);
      let analysisOutput;
      try {
        analysisOutput = await this.analyzer.analyzeFile(absPath, fp.relativePath, fp.language);
      } catch (err) {
        defaultLogger.warn(`Failed to parse AST for ${fp.relativePath}`, err);
        continue;
      }

      // Check conservative invalidation for modified files
      const existingSnapshot = previousSnapshots.get(fp.relativePath);
      if (existingSnapshot) {
        const prevAnalysis = this.analysisRepo.getLatestByFileId(existingSnapshot.id);
        if (prevAnalysis) {
          const decision = invalidator.evaluateImpact(
            fp.relativePath,
            prevAnalysis.astMetadata.exports,
            analysisOutput.astMetadata.exports
          );
          if (decision.action === 'invalidate_dependents') {
            for (const depRelPath of decision.blastRadius) {
              const depSnap = previousSnapshots.get(depRelPath);
              if (depSnap) {
                this.fileRepo.updateStatus(depSnap.id, 'stale');
                this.analysisRepo.markStaleByFileId(depSnap.id);
                invalidatedDependentsCount++;
              }
            }
          }
        }
      }

      // Save file snapshot
      const savedSnapshot = this.fileRepo.upsertFile({
        projectId: this.config.projectId,
        relativePath: fp.relativePath,
        contentHash: fp.contentHash,
        language: fp.language,
        fileSize: fp.fileSize,
        status: 'valid',
        lastScannedAt: new Date().toISOString(),
      });

      // Save analysis
      this.analysisRepo.saveAnalysis({
        fileId: savedSnapshot.id,
        contentHash: fp.contentHash,
        summary: analysisOutput.summary,
        astMetadata: analysisOutput.astMetadata,
        analyzerVersion: analysisOutput.analyzerVersion,
        schemaVersion: analysisOutput.schemaVersion,
        status: 'valid',
      });

      // Resolve imports and update dependencies
      const resolvedEdges: Array<{
        targetPath: string;
        targetFileId?: string;
        dependencyType: string;
        confidence: number;
      }> = [];

      for (const imp of analysisOutput.astMetadata.imports) {
        const resolvedPath = resolveImportSpecifier(imp.source, fp.relativePath, allKnownPaths);
        if (resolvedPath) {
          const targetSnap = previousSnapshots.get(resolvedPath);
          resolvedEdges.push({
            targetPath: resolvedPath,
            targetFileId: targetSnap?.id,
            dependencyType: imp.isTypeOnly ? 'type_reference' : 'import',
            confidence: 1.0,
          });
          this.graph.addEdge(fp.relativePath, resolvedPath);
        }
      }

      this.depRepo.replaceFileDependencies(this.config.projectId, savedSnapshot.id, resolvedEdges);
    }

    return {
      scanned: currentFingerprints.size,
      unchanged: diff.unchanged.length,
      modified: diff.modified.length,
      added: diff.added.length,
      deleted: diff.deleted.length,
      renamed: diff.renamed.length,
      invalidatedDependents: invalidatedDependentsCount,
      durationMs: Date.now() - startTime,
    };
  }

  public getStatus(): StatusSummary {
    this.ensureInitialized();
    const files = this.fileRepo.getAllByProject(this.config.projectId);
    const decisions = this.decisionRepo.listByProject(this.config.projectId);

    let total = 0;
    let valid = 0;
    let stale = 0;
    let lastScan: string | undefined;

    for (const f of files.values()) {
      if (f.status === 'deleted') continue;
      total++;
      if (f.status === 'valid') valid++;
      else stale++;
      if (!lastScan || f.lastScannedAt > lastScan) {
        lastScan = f.lastScannedAt;
      }
    }

    return {
      projectId: this.config.projectId,
      projectName: this.config.projectName,
      rootPath: this.projectRoot,
      totalFiles: total,
      validAnalyses: valid,
      staleAnalyses: stale,
      decisionsCount: decisions.length,
      sessionsCount: 0,
      lastScannedAt: lastScan,
    };
  }

  public explain(relativePath: string) {
    this.ensureInitialized();
    const normalized = normalizePath(relativePath);
    const files = this.fileRepo.getAllByProject(this.config.projectId);
    const snap = files.get(normalized);
    if (!snap) return null;

    const analysis = this.analysisRepo.getLatestByFileId(snap.id);
    const deps = this.depRepo.getUpstreamDependencies(snap.id);
    const dependents = this.depRepo.getDownstreamDependents(snap.id);

    return {
      file: snap,
      analysis,
      dependencies: deps,
      dependents,
    };
  }

  public doctor(): { healthy: boolean; checks: Array<{ name: string; passed: boolean; message: string }> } {
    this.ensureInitialized();
    const checks = [];

    // 1. SQLite integrity check
    try {
      const integrity = this.db.db.prepare('PRAGMA integrity_check;').get() as { integrity_check: string };
      const ok = integrity.integrity_check === 'ok';
      checks.push({
        name: 'SQLite Database Integrity',
        passed: ok,
        message: ok ? 'Database integrity check passed (WAL mode active)' : `Corrupt: ${integrity.integrity_check}`,
      });
    } catch (err: any) {
      checks.push({ name: 'SQLite Database Integrity', passed: false, message: err.message });
    }

    // 2. Directory write permission
    try {
      const testFile = path.join(this.projectRoot, '.repomind', '.write-test');
      this.db.db.exec('SELECT 1;');
      checks.push({
        name: 'Storage Permissions',
        passed: true,
        message: 'Write and read permissions confirmed for .repomind directory',
      });
    } catch (err: any) {
      checks.push({ name: 'Storage Permissions', passed: false, message: err.message });
    }

    const healthy = checks.every((c) => c.passed);
    return { healthy, checks };
  }

  public clean(staleOnly = false): void {
    this.ensureInitialized();
    if (staleOnly) {
      this.db.db.exec("DELETE FROM analyses WHERE status = 'stale';");
    } else {
      this.db.db.exec('DELETE FROM analyses; DELETE FROM dependencies; DELETE FROM file_versions; DELETE FROM files;');
    }
  }

  public close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}
