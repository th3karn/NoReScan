import crypto from 'node:crypto';
import os from 'node:os';
import { SyncRepository, StoredSyncCursor, StoredSyncQueueItem, BugBrainDatabase } from '@bugbrain/database';
import { defaultLogger } from '@bugbrain/shared';

export interface SyncPayload {
  projectId: string;
  deviceId: string;
  cursor: string;
  version: number;
  records: {
    files: Array<{ relativePath: string; hash: string; language?: string; summary?: string }>;
    edges: Array<{ source: string; target: string; type: string }>;
    decisions: Array<{ id: string; title: string; decision: string; rationale: string; affectedFiles: string[]; recordedAt: string }>;
  };
}

export interface SyncResult {
  success: boolean;
  syncedCursor: string;
  pushedCount: number;
  pulledCount: number;
  conflicts: string[];
  offlineQueuePending: number;
  details: string;
}

export class HybridSyncEngine {
  private syncRepo: SyncRepository;
  private db: BugBrainDatabase;
  private projectId: string;
  private deviceId: string;

  constructor(db: BugBrainDatabase, projectId: string, deviceId?: string) {
    this.db = db;
    this.syncRepo = new SyncRepository(db);
    this.projectId = projectId;
    this.deviceId = deviceId || this.resolveDeviceId();
  }

  private resolveDeviceId(): string {
    const host = os.hostname();
    const user = os.userInfo().username || 'dev';
    return crypto.createHash('sha256').update(`${host}:${user}`).digest('hex').slice(0, 16);
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getStatus(): {
    deviceId: string;
    lastSyncedAt?: string;
    syncVersion: number;
    pendingQueueCount: number;
    cursor?: string;
  } {
    const cursor = this.syncRepo.getCursor(this.projectId, this.deviceId);
    const queue = this.syncRepo.getPendingQueue(this.projectId);

    return {
      deviceId: this.deviceId,
      lastSyncedAt: cursor?.lastSyncedAt,
      syncVersion: cursor?.syncVersion || 1,
      pendingQueueCount: queue.length,
      cursor: cursor?.syncCursor,
    };
  }

  /**
   * Enqueues an offline change to the synchronization queue.
   */
  public enqueue(entityType: string, entityId: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: Record<string, unknown>): StoredSyncQueueItem {
    // Privacy invariant: Never enqueue raw source code content
    const sanitized = { ...payload };
    delete sanitized.content;
    delete sanitized.rawSource;
    delete sanitized.fileBody;

    return this.syncRepo.enqueueChange(this.projectId, entityType, entityId, operation, sanitized);
  }

  /**
   * Generates a sync payload for export to BugBrain Cloud or authorized peers.
   */
  public generatePushPayload(
    files: Array<{ relativePath: string; hash: string; language?: string; summary?: string }>,
    edges: Array<{ source: string; target: string; type: string }>,
    decisions: Array<{ id: string; title: string; decision: string; rationale: string; affectedFiles: string[]; recordedAt: string }>
  ): SyncPayload {
    const cursor = this.syncRepo.getCursor(this.projectId, this.deviceId);
    const nextCursor = new Date().toISOString();

    return {
      projectId: this.projectId,
      deviceId: this.deviceId,
      cursor: nextCursor,
      version: (cursor?.syncVersion || 0) + 1,
      records: {
        files: files.map((f) => ({
          relativePath: f.relativePath,
          hash: f.hash,
          language: f.language,
          summary: f.summary,
        })),
        edges,
        decisions,
      },
    };
  }

  /**
   * Applies an incoming peer/cloud payload using deterministic merge rules.
   */
  public applyRemotePayload(incoming: SyncPayload): SyncResult {
    const conflicts: string[] = [];
    let pulledCount = 0;

    // Check device conflict
    if (incoming.deviceId === this.deviceId) {
      defaultLogger.info('Incoming sync payload matches local device; skipping self-merge.');
      return {
        success: true,
        syncedCursor: incoming.cursor,
        pushedCount: 0,
        pulledCount: 0,
        conflicts: [],
        offlineQueuePending: this.syncRepo.getPendingQueue(this.projectId).length,
        details: 'Self payload skipped',
      };
    }

    // Deterministic merge:
    // 1. ADRs (Decisions) are append-only union. We never delete an ADR from remote.
    for (const remoteAdr of incoming.records.decisions) {
      try {
        const stmt = this.db.db.prepare('SELECT id, recorded_at FROM adr_records WHERE id = ?;');
        const existing = stmt.get(remoteAdr.id) as { id: string; recorded_at: string } | undefined;

        if (!existing) {
          const ins = this.db.db.prepare(`
            INSERT INTO adr_records (id, project_id, title, decision, rationale, affected_files, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?);
          `);
          ins.run(
            remoteAdr.id,
            this.projectId,
            remoteAdr.title,
            remoteAdr.decision,
            remoteAdr.rationale,
            JSON.stringify(remoteAdr.affectedFiles),
            remoteAdr.recordedAt
          );
          pulledCount++;
        } else {
          // Both have it: if timestamps differ, keep newest
          if (new Date(remoteAdr.recordedAt) > new Date(existing.recorded_at)) {
            const upd = this.db.db.prepare(`
              UPDATE adr_records
              SET title = ?, decision = ?, rationale = ?, affected_files = ?, recorded_at = ?
              WHERE id = ?;
            `);
            upd.run(
              remoteAdr.title,
              remoteAdr.decision,
              remoteAdr.rationale,
              JSON.stringify(remoteAdr.affectedFiles),
              remoteAdr.recordedAt,
              remoteAdr.id
            );
            pulledCount++;
          }
        }
      } catch (err: any) {
        conflicts.push(`ADR merge error (${remoteAdr.id}): ${err.message}`);
      }
    }

    // Update cursor
    this.syncRepo.updateCursor(this.projectId, this.deviceId, incoming.cursor, 'SYNCED', {
      peerDeviceId: incoming.deviceId,
      peerVersion: incoming.version,
    });

    return {
      success: conflicts.length === 0,
      syncedCursor: incoming.cursor,
      pushedCount: 0,
      pulledCount,
      conflicts,
      offlineQueuePending: this.syncRepo.getPendingQueue(this.projectId).length,
      details: `Merged ${pulledCount} incoming records with ${conflicts.length} conflict(s)`,
    };
  }
}
