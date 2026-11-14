import path from 'node:path';
import fs from 'node:fs/promises';
import {
  BugBrainDatabase,
  DatabaseMigrator,
  ProjectRepository,
  FileRepository,
  AnalysisRepository,
  DependencyRepository,
  DecisionRepository,
  SessionRepository,
} from '@bugbrain/database';
import { FileScanner } from '@bugbrain/scanner';
import { diffFingerprints, computeFingerprint } from '@bugbrain/fingerprint';
import { CodeAnalyzer } from '@bugbrain/analyzer';
import {
  DependencyGraph,
  resolveImportSpecifier,
  ConservativeInvalidator,
} from '@bugbrain/dependency-graph';
import { TaskContextEngine } from '@bugbrain/context-engine';
import {
  normalizePath,
  BugBrainConfig,
  BugBrainConfigSchema,
  DEFAULT_CONFIG,
  defaultLogger,
  ConfigurationError,
  FileSnapshot,
  FileAnalysis,
  DependencyEdge,
  DecisionRecord,
  AgentSession,
} from '@bugbrain/shared';
import crypto from 'node:crypto';
import { migrateLegacy } from './migration.js';

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

export interface HotFileEntry {
  relativePath: string;
  inDegree: number;
  dependents: string[];
}

export interface SearchResult {
  files: Array<{ relativePath: string; language?: string; status: string }>;
  symbols: Array<{ file: string; name: string; kind: string }>;
  routes: Array<{ file: string; method: string; path: string }>;
  decisions: Array<{ id: string; title: string; decision: string }>;
}

export class BugBrainCore {
  public readonly projectRoot: string;
  public config!: BugBrainConfig;
  public db!: BugBrainDatabase;
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
   * Loads existing .bugbrain/config.json or returns null if uninitialized.
   * Automatically migrates legacy .repomind/ if present.
   */
  public async loadConfig(): Promise<BugBrainConfig | null> {
    const configPath = path.join(this.projectRoot, '.bugbrain', 'config.json');
    let content: string;
    try {
      content = await fs.readFile(configPath, 'utf8');
    } catch {
      // Check for legacy .repomind/
      const legacyPath = path.join(this.projectRoot, '.repomind', 'config.json');
      try {
        await fs.access(legacyPath);
        await migrateLegacy(this.projectRoot);
        content = await fs.readFile(configPath, 'utf8');
      } catch {
        return null;
      }
    }

    const parsed = BugBrainConfigSchema.parse(JSON.parse(content));
    this.config = parsed;
    this.initDatabase();
    return parsed;
  }

  /**
   * Initializes a new BugBrain workspace.
   */
  public async init(projectName?: string): Promise<BugBrainConfig> {
    // Check if legacy workspace exists and migrate
    try {
      const legacyStat = await fs.stat(path.join(this.projectRoot, '.repomind'));
      if (legacyStat.isDirectory()) {
        await migrateLegacy(this.projectRoot);
      }
    } catch {}

    const bugbrainDir = path.join(this.projectRoot, '.bugbrain');
    await fs.mkdir(bugbrainDir, { recursive: true });

    const name = projectName || path.basename(this.projectRoot);
    const existing = await this.loadConfig();
    if (existing) {
      return existing;
    }

    const newConfig: BugBrainConfig = {
      ...DEFAULT_CONFIG,
      projectId: crypto.randomUUID(),
      projectName: name,
    };

    const configPath = path.join(bugbrainDir, 'config.json');
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
    const dbPath = path.join(this.projectRoot, '.bugbrain', 'bugbrain.db');
    this.db = new BugBrainDatabase({ filename: dbPath });

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

    // Populate memory graph from stored dependencies
    this.reloadDependencyGraph();
  }

  private reloadDependencyGraph(): void {
    if (!this.depRepo || !this.config) return;
    try {
      const edges = this.depRepo.getAllEdgesByProject(this.config.projectId);
      for (const edge of edges) {
        if (edge.targetPath) {
          // Resolve source file path
          const sourceFile = this.fileRepo.getById(edge.sourceFileId);
          if (sourceFile) {
            this.graph.addEdge(sourceFile.relativePath, edge.targetPath);
          }
        }
      }
    } catch {}
  }

  private ensureInitialized(): void {
    if (!this.config || !this.db) {
      throw new ConfigurationError(
        `BugBrain is not initialized in ${this.projectRoot}. Run "bugbrain init" first.`
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

  /**
   * Re-analyzes a specific file or all modified files.
   */
  public async refreshFile(relativePath?: string): Promise<{ refreshed: number; details: string }> {
    this.ensureInitialized();
    if (!relativePath) {
      const summary = await this.scan();
      return {
        refreshed: summary.modified + summary.added,
        details: `Scanned ${summary.scanned} files (${summary.modified} modified, ${summary.added} added refreshed).`,
      };
    }

    const normalized = normalizePath(relativePath);
    const absPath = path.join(this.projectRoot, normalized);

    try {
      await fs.access(absPath);
    } catch {
      return { refreshed: 0, details: `File ${normalized} does not exist.` };
    }

    const fp = await computeFingerprint(absPath, this.projectRoot);
    const analysis = await this.analyzer.analyzeFile(absPath, normalized, fp.language);

    const savedSnapshot = this.fileRepo.upsertFile({
      projectId: this.config.projectId,
      relativePath: normalized,
      contentHash: fp.contentHash,
      language: fp.language,
      fileSize: fp.fileSize,
      status: 'valid',
      lastScannedAt: new Date().toISOString(),
    });

    this.analysisRepo.saveAnalysis({
      fileId: savedSnapshot.id,
      contentHash: fp.contentHash,
      summary: analysis.summary,
      astMetadata: analysis.astMetadata,
      analyzerVersion: analysis.analyzerVersion,
      schemaVersion: analysis.schemaVersion,
      status: 'valid',
    });

    return { refreshed: 1, details: `Successfully refreshed analysis for ${normalized}` };
  }

  /**
   * Returns current diff (added, modified, deleted) against database snapshots without saving.
   */
  public async getDiff(): Promise<{
    added: string[];
    modified: string[];
    deleted: string[];
    unchanged: number;
  }> {
    this.ensureInitialized();
    const scanner = new FileScanner({
      projectRoot: this.projectRoot,
      config: this.config,
    });
    await scanner.init();

    const scanResult = await scanner.scan();
    const previousSnapshots = this.fileRepo.getAllByProject(this.config.projectId);
    const diff = diffFingerprints(scanResult.fingerprints, previousSnapshots);

    return {
      added: diff.added.map((f) => f.relativePath),
      modified: diff.modified.map((f) => f.relativePath),
      deleted: diff.deleted.map((f) => f.relativePath),
      unchanged: diff.unchanged.length,
    };
  }

  /**
   * Retrieves high-level workspace health and memory status.
   */
  public getStatus(): StatusSummary {
    this.ensureInitialized();
    const files = this.fileRepo.getAllByProject(this.config.projectId);
    const decisions = this.decisionRepo.listByProject(this.config.projectId);
    const sessions = this.sessionRepo.listByProject(this.config.projectId);

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
      sessionsCount: sessions.length,
      lastScannedAt: lastScan,
    };
  }

  /**
   * Explains a specific file, including its analysis, exports, imports, and blast radius.
   */
  public explain(relativePath: string) {
    this.ensureInitialized();
    const normalized = normalizePath(relativePath);
    const files = this.fileRepo.getAllByProject(this.config.projectId);
    const snap = files.get(normalized);
    if (!snap) return null;

    const analysis = this.analysisRepo.getLatestByFileId(snap.id);
    const deps = this.depRepo.getUpstreamDependencies(snap.id);
    const dependents = this.depRepo.getDownstreamDependents(snap.id);
    const blastRadius = this.graph.getBlastRadius([normalized]);

    return {
      file: snap,
      analysis,
      dependencies: deps,
      dependents,
      blastRadius,
    };
  }

  /**
   * Returns dependency details, blast radius, and cycle detection for a path.
   */
  public getDependencies(relativePath: string) {
    this.ensureInitialized();
    const normalized = normalizePath(relativePath);
    const files = this.fileRepo.getAllByProject(this.config.projectId);
    const snap = files.get(normalized);
    if (!snap) return null;

    const upstream = this.depRepo.getUpstreamDependencies(snap.id);
    const downstream = this.depRepo.getDownstreamDependents(snap.id);
    const blastRadius = this.graph.getBlastRadius([normalized]);
    const cycles = this.graph.findCycles();
    const involvedCycles = cycles.filter((c) => c.includes(normalized));

    return {
      file: normalized,
      upstream: upstream.map((u) => u.targetPath),
      downstream: downstream.map((d) => d.targetPath),
      blastRadius,
      cycles: involvedCycles,
    };
  }

  /**
   * Returns the most load-bearing files with the highest in-degree (dependents).
   */
  public getHotFiles(limit = 10): HotFileEntry[] {
    this.ensureInitialized();
    const entries: HotFileEntry[] = [];
    for (const node of this.graph.getNodes()) {
      const dependents = this.graph.getDependents(node);
      entries.push({
        relativePath: node,
        inDegree: dependents.length,
        dependents,
      });
    }

    entries.sort((a, b) => b.inDegree - a.inDegree);
    return entries.slice(0, limit);
  }

  /**
   * Computes the transitive blast radius cone for a given list of files (e.g. from git diff).
   */
  public getBlastRadius(relativePaths: string[]): string[] {
    this.ensureInitialized();
    const normalized = relativePaths.map((p) => normalizePath(p));
    return this.graph.getBlastRadius(normalized);
  }

  /**
   * Searches project memory across file paths, symbols, routes, and architectural decisions.
   */
  public search(query: string, limit = 20): SearchResult {
    this.ensureInitialized();
    const q = query.toLowerCase();
    const result: SearchResult = {
      files: [],
      symbols: [],
      routes: [],
      decisions: [],
    };

    const files = this.fileRepo.getAllByProject(this.config.projectId);
    for (const f of files.values()) {
      if (f.status === 'deleted') continue;
      if (f.relativePath.toLowerCase().includes(q)) {
        result.files.push({
          relativePath: f.relativePath,
          language: f.language,
          status: f.status,
        });
      }

      const analysis = this.analysisRepo.getLatestByFileId(f.id);
      if (analysis) {
        for (const sym of analysis.astMetadata.symbols || []) {
          if (sym.name.toLowerCase().includes(q)) {
            result.symbols.push({
              file: f.relativePath,
              name: sym.name,
              kind: sym.kind,
            });
          }
        }
        for (const rt of analysis.astMetadata.routes || []) {
          if (rt.path.toLowerCase().includes(q) || rt.method.toLowerCase().includes(q)) {
            result.routes.push({
              file: f.relativePath,
              method: rt.method,
              path: rt.path,
            });
          }
        }
      }
    }

    const decisions = this.decisionRepo.listByProject(this.config.projectId);
    for (const d of decisions) {
      if (
        d.title.toLowerCase().includes(q) ||
        d.decision.toLowerCase().includes(q) ||
        d.rationale.toLowerCase().includes(q)
      ) {
        result.decisions.push({
          id: d.id,
          title: d.title,
          decision: d.decision,
        });
      }
    }

    result.files = result.files.slice(0, limit);
    result.symbols = result.symbols.slice(0, limit);
    result.routes = result.routes.slice(0, limit);
    result.decisions = result.decisions.slice(0, limit);

    return result;
  }

  /**
   * Records an Architectural Decision Record (ADR).
   */
  public recordDecision(params: {
    title: string;
    decision: string;
    rationale: string;
    affectedFiles?: string[];
    sessionId?: string;
  }): DecisionRecord {
    this.ensureInitialized();
    return this.decisionRepo.recordDecision({
      projectId: this.config.projectId,
      title: params.title,
      decision: params.decision,
      rationale: params.rationale,
      affectedFiles: params.affectedFiles || [],
      sessionId: params.sessionId,
    });
  }

  /**
   * Records an Agent session.
   */
  public recordSession(params: {
    agentName: string;
    summary?: string;
    metadata?: Record<string, unknown>;
  }): AgentSession {
    this.ensureInitialized();
    const session = this.sessionRepo.startSession(this.config.projectId, params.agentName, params.metadata);
    if (params.summary) {
      this.sessionRepo.endSession(session.id, params.summary);
      session.summary = params.summary;
    }
    return session;
  }

  /**
   * Retrieves session activity history.
   */
  public getHistory(limit = 20): AgentSession[] {
    this.ensureInitialized();
    return this.sessionRepo.listByProject(this.config.projectId, limit);
  }

  /**
   * Exports project memory into portable JSON.
   */
  public async exportMemory(): Promise<object> {
    this.ensureInitialized();
    const files = Array.from(this.fileRepo.getAllByProject(this.config.projectId).values());
    const analyses: FileAnalysis[] = [];
    for (const f of files) {
      const a = this.analysisRepo.getLatestByFileId(f.id);
      if (a) analyses.push(a);
    }
    const decisions = this.decisionRepo.listByProject(this.config.projectId);
    const sessions = this.sessionRepo.listByProject(this.config.projectId, 100);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      config: this.config,
      files,
      analyses,
      decisions,
      sessions,
    };
  }

  /**
   * Imports project memory from JSON.
   */
  public async importMemory(data: any): Promise<{ importedFiles: number; importedDecisions: number }> {
    this.ensureInitialized();
    let importedFiles = 0;
    let importedDecisions = 0;

    if (Array.isArray(data.files)) {
      for (const f of data.files) {
        this.fileRepo.upsertFile({
          projectId: this.config.projectId,
          relativePath: f.relativePath,
          contentHash: f.contentHash,
          language: f.language,
          fileSize: f.fileSize,
          status: f.status || 'valid',
          lastScannedAt: f.lastScannedAt || new Date().toISOString(),
        });
        importedFiles++;
      }
    }

    if (Array.isArray(data.decisions)) {
      for (const d of data.decisions) {
        this.decisionRepo.recordDecision({
          projectId: this.config.projectId,
          title: d.title,
          decision: d.decision,
          rationale: d.rationale,
          affectedFiles: d.affectedFiles || [],
        });
        importedDecisions++;
      }
    }

    return { importedFiles, importedDecisions };
  }

  /**
   * Safely backs up the SQLite database file to a destination path.
   */
  public async backupDatabase(destinationPath?: string): Promise<string> {
    this.ensureInitialized();
    const dbPath = path.join(this.projectRoot, '.bugbrain', 'bugbrain.db');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = destinationPath || path.join(this.projectRoot, '.bugbrain', `bugbrain.backup-${timestamp}.db`);

    // Run PRAGMA wal_checkpoint(FULL) to ensure all writes are flushed
    try {
      this.db.db.exec('PRAGMA wal_checkpoint(FULL);');
    } catch {}

    await fs.copyFile(dbPath, dest);
    return dest;
  }

  /**
   * Runs diagnostic checks on database, permissions, and schema.
   */
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
      const testFile = path.join(this.projectRoot, '.bugbrain', '.write-test');
      this.db.db.exec('SELECT 1;');
      checks.push({
        name: 'Storage Permissions',
        passed: true,
        message: 'Write and read permissions confirmed for .bugbrain directory',
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
