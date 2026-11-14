import { CodeCacheDatabase } from './connection.js';
import {
  Project,
  FileSnapshot,
  FileAnalysis,
  FileAnalysisStatus,
  DependencyEdge,
  DecisionRecord,
  AgentSession,
  TaskRecord,
  AstMetadata,
} from '@code-cache/shared';
import crypto from 'node:crypto';

export class ProjectRepository {
  constructor(private db: CodeCacheDatabase) { }

  public upsert(project: Omit<Project, 'createdAt' | 'updatedAt'>): Project {
  const now = new Date().toISOString();
  const existing = this.getById(project.id);

  if (existing) {
    const stmt = this.db.db.prepare(`
        UPDATE projects
        SET root_path = ?, name = ?, config_hash = ?, sync_enabled = ?, updated_at = ?
        WHERE id = ?;
      `);
    stmt.run(project.rootPath, project.name, project.configHash, project.syncEnabled ? 1 : 0, now, project.id);
    return { ...existing, ...project, updatedAt: now };
  }

  const stmt = this.db.db.prepare(`
      INSERT INTO projects (id, root_path, name, config_hash, sync_enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `);
  stmt.run(project.id, project.rootPath, project.name, project.configHash, project.syncEnabled ? 1 : 0, now, now);

  return { ...project, createdAt: now, updatedAt: now };
}

  public getById(id: string): Project | null {
  const stmt = this.db.db.prepare('SELECT * FROM projects WHERE id = ?;');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return this.mapRowToProject(row);
}

  public getByPath(rootPath: string): Project | null {
  const stmt = this.db.db.prepare('SELECT * FROM projects WHERE root_path = ?;');
  const row = stmt.get(rootPath) as Record<string, unknown> | undefined;
  if (!row) return null;
  return this.mapRowToProject(row);
}

  private mapRowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    rootPath: row.root_path as string,
    name: row.name as string,
    configHash: row.config_hash as string,
    syncEnabled: Boolean(row.sync_enabled),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
}

export class FileRepository {
  constructor(private db: CodeCacheDatabase) { }

  public upsertFile(file: Omit<FileSnapshot, 'id'> & { id?: string }): FileSnapshot {
  const now = new Date().toISOString();

  const existingStmt = this.db.db.prepare(
    'SELECT id FROM files WHERE project_id = ? AND relative_path = ?;'
  );
  const existing = existingStmt.get(file.projectId, file.relativePath) as { id: string } | undefined;
  const fileId = file.id || existing?.id || crypto.randomUUID();

  if (existing) {
    const updateStmt = this.db.db.prepare(`
        UPDATE files SET
          content_hash = ?,
          language = ?,
          file_size = ?,
          status = ?,
          last_scanned_at = ?
        WHERE id = ?;
      `);
    updateStmt.run(file.contentHash, file.language, file.fileSize, file.status, file.lastScannedAt || now, fileId);
  } else {
    const insertStmt = this.db.db.prepare(`
        INSERT INTO files (id, project_id, relative_path, content_hash, language, file_size, status, last_scanned_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `);
    insertStmt.run(
      fileId,
      file.projectId,
      file.relativePath,
      file.contentHash,
      file.language,
      file.fileSize,
      file.status,
      file.lastScannedAt || now
    );
  }

  // Record historical version
  const versionStmt = this.db.db.prepare(`
      INSERT INTO file_versions (id, file_id, content_hash, file_size, recorded_at)
      VALUES (?, ?, ?, ?, ?);
    `);
  versionStmt.run(crypto.randomUUID(), fileId, file.contentHash, file.fileSize, now);

  return { ...file, id: fileId, lastScannedAt: file.lastScannedAt || now };
}

  public getById(id: string): FileSnapshot | null {
  const stmt = this.db.db.prepare('SELECT * FROM files WHERE id = ?;');
  const r = stmt.get(id) as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    relativePath: r.relative_path as string,
    contentHash: r.content_hash as string,
    language: r.language as string,
    fileSize: Number(r.file_size),
    status: r.status as FileAnalysisStatus,
    lastScannedAt: r.last_scanned_at as string,
  };
}

  public getAllByProject(projectId: string): Map < string, FileSnapshot > {
  const stmt = this.db.db.prepare('SELECT * FROM files WHERE project_id = ?;');
  const rows = stmt.all(projectId) as Array<Record<string, unknown>>;
  const map = new Map<string, FileSnapshot>();

  for(const r of rows) {
    const snap: FileSnapshot = {
      id: r.id as string,
      projectId: r.project_id as string,
      relativePath: r.relative_path as string,
      contentHash: r.content_hash as string,
      language: r.language as string,
      fileSize: Number(r.file_size),
      status: r.status as FileAnalysisStatus,
      lastScannedAt: r.last_scanned_at as string,
    };
    map.set(snap.relativePath, snap);
  }
    return map;
}

  public markDeleted(projectId: string, relativePath: string): void {
  const stmt = this.db.db.prepare(`
      UPDATE files SET status = 'deleted' WHERE project_id = ? AND relative_path = ?;
    `);
  stmt.run(projectId, relativePath);
}

  public updateStatus(fileId: string, status: FileAnalysisStatus): void {
  const stmt = this.db.db.prepare('UPDATE files SET status = ? WHERE id = ?;');
  stmt.run(status, fileId);
}
}

export class AnalysisRepository {
  constructor(private db: CodeCacheDatabase) { }

  public saveAnalysis(analysis: Omit<FileAnalysis, 'id' | 'createdAt'>): FileAnalysis {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = this.db.db.prepare(`
      INSERT INTO analyses (id, file_id, content_hash, summary, ast_metadata, analyzer_version, schema_version, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
  stmt.run(
    id,
    analysis.fileId,
    analysis.contentHash,
    analysis.summary,
    JSON.stringify(analysis.astMetadata),
    analysis.analyzerVersion,
    analysis.schemaVersion,
    analysis.status,
    now
  );

  return { ...analysis, id, createdAt: now };
}

  public getLatestByFileId(fileId: string): FileAnalysis | null {
  const stmt = this.db.db.prepare(`
      SELECT * FROM analyses WHERE file_id = ? ORDER BY created_at DESC LIMIT 1;
    `);
  const row = stmt.get(fileId) as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    id: row.id as string,
    fileId: row.file_id as string,
    contentHash: row.content_hash as string,
    summary: row.summary as string,
    astMetadata: JSON.parse(row.ast_metadata as string) as AstMetadata,
    analyzerVersion: row.analyzer_version as string,
    schemaVersion: Number(row.schema_version),
    status: row.status as 'valid' | 'stale',
    createdAt: row.created_at as string,
  };
}

  public markStaleByFileId(fileId: string): void {
  const stmt = this.db.db.prepare(`
      UPDATE analyses SET status = 'stale' WHERE file_id = ?;
    `);
  stmt.run(fileId);
}
}

export class DependencyRepository {
  constructor(private db: CodeCacheDatabase) { }

  public replaceFileDependencies(
    projectId: string,
    sourceFileId: string,
    edges: Array<{ targetPath: string; targetFileId?: string; dependencyType: string; confidence?: number }>
  ): void {
    this.db.transaction(() => {
      const del = this.db.db.prepare('DELETE FROM dependencies WHERE project_id = ? AND source_file_id = ?;');
      del.run(projectId, sourceFileId);

      const ins = this.db.db.prepare(`
        INSERT INTO dependencies (id, project_id, source_file_id, target_file_id, target_path, dependency_type, confidence, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `);
      const now = new Date().toISOString();
      for (const edge of edges) {
        ins.run(
          crypto.randomUUID(),
          projectId,
          sourceFileId,
          edge.targetFileId ?? null,
          edge.targetPath,
          edge.dependencyType,
          edge.confidence ?? 1.0,
          now
        );
      }
    });
  }

  public getAllEdgesByProject(projectId: string): DependencyEdge[] {
  const stmt = this.db.db.prepare('SELECT * FROM dependencies WHERE project_id = ?;');
  const rows = stmt.all(projectId) as Array<Record<string, unknown>>;
  return rows.map((r) => this.mapRow(r));
}

  public getUpstreamDependencies(fileId: string): DependencyEdge[] {
  const stmt = this.db.db.prepare('SELECT * FROM dependencies WHERE source_file_id = ?;');
  const rows = stmt.all(fileId) as Array<Record<string, unknown>>;
  return rows.map((r) => this.mapRow(r));
}

  public getDownstreamDependents(fileId: string): DependencyEdge[] {
  const stmt = this.db.db.prepare('SELECT * FROM dependencies WHERE target_file_id = ?;');
  const rows = stmt.all(fileId) as Array<Record<string, unknown>>;
  return rows.map((r) => this.mapRow(r));
}

  private mapRow(r: Record<string, unknown>): DependencyEdge {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    sourceFileId: r.source_file_id as string,
    targetFileId: (r.target_file_id as string) || undefined,
    targetPath: r.target_path as string,
    dependencyType: r.dependency_type as any,
    confidence: Number(r.confidence),
    createdAt: r.created_at as string,
  };
}
}

export class DecisionRepository {
  constructor(private db: CodeCacheDatabase) { }

  public recordDecision(decision: Omit<DecisionRecord, 'id' | 'createdAt'>): DecisionRecord {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = this.db.db.prepare(`
      INSERT INTO decisions (id, project_id, session_id, title, rationale, decision, affected_files, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);
  stmt.run(
    id,
    decision.projectId,
    decision.sessionId ?? null,
    decision.title,
    decision.rationale,
    decision.decision,
    JSON.stringify(decision.affectedFiles || []),
    now
  );

  return { ...decision, id, createdAt: now };
}

  public listByProject(projectId: string): DecisionRecord[] {
  const stmt = this.db.db.prepare('SELECT * FROM decisions WHERE project_id = ? ORDER BY created_at DESC;');
  const rows = stmt.all(projectId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    sessionId: (r.session_id as string) || undefined,
    title: r.title as string,
    rationale: r.rationale as string,
    decision: r.decision as string,
    affectedFiles: JSON.parse(r.affected_files as string || '[]'),
    createdAt: r.created_at as string,
  }));
}
}

export class SessionRepository {
  constructor(private db: CodeCacheDatabase) { }

  public startSession(projectId: string, agentName: string, metadata ?: Record<string, unknown>): AgentSession {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = this.db.db.prepare(`
      INSERT INTO sessions (id, project_id, agent_name, started_at, metadata)
      VALUES (?, ?, ?, ?, ?);
    `);
  stmt.run(id, projectId, agentName, now, metadata ? JSON.stringify(metadata) : null);

  return { id, projectId, agentName, startedAt: now, metadata };
}

  public endSession(sessionId: string, summary: string): void {
  const now = new Date().toISOString();
  const stmt = this.db.db.prepare(`
      UPDATE sessions SET ended_at = ?, summary = ? WHERE id = ?;
    `);
  stmt.run(now, summary, sessionId);
}

  public listByProject(projectId: string, limit = 20): AgentSession[] {
  const stmt = this.db.db.prepare('SELECT * FROM sessions WHERE project_id = ? ORDER BY started_at DESC LIMIT ?;');
  const rows = stmt.all(projectId, limit) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: row.id as string,
    projectId: row.project_id as string,
    agentName: row.agent_name as string,
    startedAt: row.started_at as string,
    endedAt: (row.ended_at as string) || undefined,
    summary: (row.summary as string) || undefined,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
  }));
}

  public getLatest(projectId: string): AgentSession | null {
  const stmt = this.db.db.prepare('SELECT * FROM sessions WHERE project_id = ? ORDER BY started_at DESC LIMIT 1;');
  const row = stmt.get(projectId) as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    id: row.id as string,
    projectId: row.project_id as string,
    agentName: row.agent_name as string,
    startedAt: row.started_at as string,
    endedAt: (row.ended_at as string) || undefined,
    summary: (row.summary as string) || undefined,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
  };
}
}

export interface StoredProjectCommand {
  id: string;
  projectId: string;
  name: string;
  rawCommand: string;
  category: string;
  sourceFile: string;
  workingDir: string;
  description?: string;
  safeToRun: boolean;
  requiresNetwork: boolean;
  ecosystemId: string;
  recordedAt: string;
}

export interface StoredPackageDependency {
  id: string;
  projectId: string;
  manifestId: string;
  name: string;
  declaredVersion: string;
  resolvedVersion?: string;
  dependencyType: string;
  registry?: string;
  isDirect: boolean;
  isOptional: boolean;
  platformCondition?: string;
  recordedAt: string;
}

export interface StoredWorkspaceMember {
  id: string;
  projectId: string;
  name: string;
  relativePath: string;
  ecosystemId: string;
  manifestPath: string;
  dependencies: string[];
  recordedAt: string;
}

export class EcosystemRepository {
  constructor(private db: CodeCacheDatabase) { }

  public replaceProjectCommands(projectId: string, commands: Array<Omit<StoredProjectCommand, 'id' | 'projectId' | 'recordedAt'>>): void {
  const now = new Date().toISOString();
  this.db.transaction(() => {
    this.db.db.prepare('DELETE FROM project_commands WHERE project_id = ?;').run(projectId);
    const ins = this.db.db.prepare(`
        INSERT INTO project_commands (id, project_id, name, raw_command, category, source_file, working_dir, description, safe_to_run, requires_network, ecosystem_id, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
    for (const cmd of commands) {
      ins.run(
        crypto.randomUUID(),
        projectId,
        cmd.name,
        cmd.rawCommand,
        cmd.category,
        cmd.sourceFile,
        cmd.workingDir,
        cmd.description ?? null,
        cmd.safeToRun ? 1 : 0,
        cmd.requiresNetwork ? 1 : 0,
        cmd.ecosystemId,
        now
      );
    }
  });
}

  public getProjectCommands(projectId: string, category ?: string): StoredProjectCommand[] {
  const query = category
    ? 'SELECT * FROM project_commands WHERE project_id = ? AND category = ? ORDER BY name ASC;'
    : 'SELECT * FROM project_commands WHERE project_id = ? ORDER BY category ASC, name ASC;';
  const rows = (category ? this.db.db.prepare(query).all(projectId, category) : this.db.db.prepare(query).all(projectId)) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    name: r.name as string,
    rawCommand: r.raw_command as string,
    category: r.category as string,
    sourceFile: r.source_file as string,
    workingDir: r.working_dir as string,
    description: (r.description as string) || undefined,
    safeToRun: Boolean(r.safe_to_run),
    requiresNetwork: Boolean(r.requires_network),
    ecosystemId: r.ecosystem_id as string,
    recordedAt: r.recorded_at as string,
  }));
}

  public replacePackageDependencies(projectId: string, manifestId: string, deps: Array<Omit<StoredPackageDependency, 'id' | 'projectId' | 'manifestId' | 'recordedAt'>>): void {
  const now = new Date().toISOString();
  this.db.transaction(() => {
    this.db.db.prepare('DELETE FROM package_dependencies WHERE project_id = ? AND manifest_id = ?;').run(projectId, manifestId);
    const ins = this.db.db.prepare(`
        INSERT INTO package_dependencies (id, project_id, manifest_id, name, declared_version, resolved_version, dependency_type, registry, is_direct, is_optional, platform_condition, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
    for (const dep of deps) {
      ins.run(
        crypto.randomUUID(),
        projectId,
        manifestId,
        dep.name,
        dep.declaredVersion,
        dep.resolvedVersion ?? null,
        dep.dependencyType,
        dep.registry ?? null,
        dep.isDirect ? 1 : 0,
        dep.isOptional ? 1 : 0,
        dep.platformCondition ?? null,
        now
      );
    }
  });
}

  public getPackageDependencies(projectId: string): StoredPackageDependency[] {
  const stmt = this.db.db.prepare('SELECT * FROM package_dependencies WHERE project_id = ? ORDER BY name ASC;');
  const rows = stmt.all(projectId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    manifestId: r.manifest_id as string,
    name: r.name as string,
    declaredVersion: r.declared_version as string,
    resolvedVersion: (r.resolved_version as string) || undefined,
    dependencyType: r.dependency_type as string,
    registry: (r.registry as string) || undefined,
    isDirect: Boolean(r.is_direct),
    isOptional: Boolean(r.is_optional),
    platformCondition: (r.platform_condition as string) || undefined,
    recordedAt: r.recorded_at as string,
  }));
}

  public replaceWorkspaceMembers(projectId: string, members: Array<Omit<StoredWorkspaceMember, 'id' | 'projectId' | 'recordedAt'>>): void {
  const now = new Date().toISOString();
  this.db.transaction(() => {
    this.db.db.prepare('DELETE FROM workspace_members WHERE project_id = ?;').run(projectId);
    const ins = this.db.db.prepare(`
        INSERT INTO workspace_members (id, project_id, name, relative_path, ecosystem_id, manifest_path, dependencies, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `);
    for (const m of members) {
      ins.run(
        crypto.randomUUID(),
        projectId,
        m.name,
        m.relativePath,
        m.ecosystemId,
        m.manifestPath,
        JSON.stringify(m.dependencies),
        now
      );
    }
  });
}

  public getWorkspaceMembers(projectId: string): StoredWorkspaceMember[] {
  const stmt = this.db.db.prepare('SELECT * FROM workspace_members WHERE project_id = ? ORDER BY name ASC;');
  const rows = stmt.all(projectId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    name: r.name as string,
    relativePath: r.relative_path as string,
    ecosystemId: r.ecosystem_id as string,
    manifestPath: r.manifest_path as string,
    dependencies: JSON.parse((r.dependencies as string) || '[]'),
    recordedAt: r.recorded_at as string,
  }));
}
}

export interface StoredSyncCursor {
  id: string;
  projectId: string;
  deviceId: string;
  lastSyncedAt: string;
  syncCursor: string;
  syncVersion: number;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface StoredSyncQueueItem {
  id: string;
  projectId: string;
  entityType: string;
  entityId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  createdAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  attemptCount: number;
  errorMessage?: string;
}

export class SyncRepository {
  private db: CodeCacheDatabase;

constructor(db: CodeCacheDatabase) {
  this.db = db;
}

  public getCursor(projectId: string, deviceId: string): StoredSyncCursor | null {
  const stmt = this.db.db.prepare('SELECT * FROM sync_cursors WHERE project_id = ? AND device_id = ?;');
  const row = stmt.get(projectId, deviceId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    deviceId: row.device_id as string,
    lastSyncedAt: row.last_synced_at as string,
    syncCursor: row.sync_cursor as string,
    syncVersion: Number(row.sync_version || 1),
    status: row.status as string,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
  };
}

  public updateCursor(
  projectId: string,
  deviceId: string,
  syncCursor: string,
  status = 'SYNCED',
  metadata ?: Record<string, unknown>
): StoredSyncCursor {
  const now = new Date().toISOString();
  const existing = this.getCursor(projectId, deviceId);

  if (existing) {
    const stmt = this.db.db.prepare(`
        UPDATE sync_cursors
        SET sync_cursor = ?, last_synced_at = ?, sync_version = sync_version + 1, status = ?, metadata = ?
        WHERE project_id = ? AND device_id = ?;
      `);
    stmt.run(syncCursor, now, status, metadata ? JSON.stringify(metadata) : null, projectId, deviceId);
    return this.getCursor(projectId, deviceId)!;
  } else {
    const id = crypto.randomUUID();
    const stmt = this.db.db.prepare(`
        INSERT INTO sync_cursors (id, project_id, device_id, last_synced_at, sync_cursor, sync_version, status, metadata)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?);
      `);
    stmt.run(id, projectId, deviceId, now, syncCursor, status, metadata ? JSON.stringify(metadata) : null);
    return {
      id,
      projectId,
      deviceId,
      lastSyncedAt: now,
      syncCursor,
      syncVersion: 1,
      status,
      metadata,
    };
  }
}

  public enqueueChange(
  projectId: string,
  entityType: string,
  entityId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: Record<string, unknown>
): StoredSyncQueueItem {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const stmt = this.db.db.prepare(`
      INSERT INTO sync_offline_queue (id, project_id, entity_type, entity_id, operation, payload, created_at, status, attempt_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0);
    `);
  stmt.run(id, projectId, entityType, entityId, operation, JSON.stringify(payload), now);

  return {
    id,
    projectId,
    entityType,
    entityId,
    operation,
    payload,
    createdAt: now,
    status: 'PENDING',
    attemptCount: 0,
  };
}

  public getPendingQueue(projectId: string): StoredSyncQueueItem[] {
  const stmt = this.db.db.prepare(
    "SELECT * FROM sync_offline_queue WHERE project_id = ? AND status = 'PENDING' ORDER BY created_at ASC;"
  );
  const rows = stmt.all(projectId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    entityType: r.entity_type as string,
    entityId: r.entity_id as string,
    operation: r.operation as any,
    payload: JSON.parse((r.payload as string) || '{}'),
    createdAt: r.created_at as string,
    status: r.status as any,
    attemptCount: Number(r.attempt_count || 0),
    errorMessage: (r.error_message as string) || undefined,
  }));
}

  public markQueueItem(id: string, status: 'SYNCED' | 'FAILED' | 'CONFLICT', error ?: string): void {
  const stmt = this.db.db.prepare(`
      UPDATE sync_offline_queue
      SET status = ?, attempt_count = attempt_count + 1, error_message = ?
      WHERE id = ?;
    `);
  stmt.run(status, error ?? null, id);
}

  public purgeSyncedQueue(projectId: string): number {
  const stmt = this.db.db.prepare("DELETE FROM sync_offline_queue WHERE project_id = ? AND status = 'SYNCED';");
  const res = stmt.run(projectId);
  return Number(res.changes);
}
}


