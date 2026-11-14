import { BugBrainDatabase } from './connection.js';
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
} from '@bugbrain/shared';
import crypto from 'node:crypto';

export class ProjectRepository {
  constructor(private db: BugBrainDatabase) { }

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
  constructor(private db: BugBrainDatabase) { }

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

  public getAllByProject(projectId: string): Map<string, FileSnapshot> {
    const stmt = this.db.db.prepare('SELECT * FROM files WHERE project_id = ?;');
    const rows = stmt.all(projectId) as Array<Record<string, unknown>>;
    const map = new Map<string, FileSnapshot>();

    for (const r of rows) {
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
  constructor(private db: BugBrainDatabase) { }

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
  constructor(private db: BugBrainDatabase) { }

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
  constructor(private db: BugBrainDatabase) { }

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
  constructor(private db: BugBrainDatabase) { }

  public startSession(projectId: string, agentName: string, metadata?: Record<string, unknown>): AgentSession {
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
