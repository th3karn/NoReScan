import crypto from 'node:crypto';
import { EncryptedPayload, BackupArchive, defaultLogger } from '@norescan/shared';
import type { NoReScanCore } from './core.js';
import type { SyncPayload } from './sync.js';

export class EncryptedMemoryEngine {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * Derives a 256-bit key using scrypt from a passphrase and salt.
   */
  public static deriveKey(passphrase: string, salt: Buffer): Buffer {
    return crypto.scryptSync(passphrase, salt, 32);
  }

  /**
   * Encrypts any serializable object using client-side AES-256-GCM.
   */
  public static encryptPayload<T>(data: T, keyOrPassphrase: string | Buffer): EncryptedPayload {
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const key = Buffer.isBuffer(keyOrPassphrase)
      ? keyOrPassphrase
      : this.deriveKey(keyOrPassphrase, salt);

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv, {
      authTagLength: this.TAG_LENGTH,
    });

    const plaintext = JSON.stringify(data);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      version: 1,
      algorithm: 'aes-256-gcm',
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext: encrypted.toString('base64'),
      salt: salt.toString('hex'),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Decrypts an AES-256-GCM payload and verifies cryptographic integrity.
   */
  public static decryptPayload<T>(payload: EncryptedPayload, keyOrPassphrase: string | Buffer): T {
    if (payload.algorithm !== 'aes-256-gcm') {
      throw new Error(`Unsupported encryption algorithm: ${payload.algorithm}`);
    }

    const salt = Buffer.from(payload.salt, 'hex');
    const key = Buffer.isBuffer(keyOrPassphrase)
      ? keyOrPassphrase
      : this.deriveKey(keyOrPassphrase, salt);

    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv, {
      authTagLength: this.TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as T;
  }

  /**
   * Generates a complete encrypted backup archive of the repository memory.
   */
  public static async createBackup(core: NoReScanCore, passphrase = 'default-norescan-key'): Promise<BackupArchive> {
    const projectId = core.config?.projectId || 'proj-1';
    const projectName = core.config?.projectName || 'app';
    const project = core.projectRepo.getById(projectId) || {
      id: projectId,
      name: projectName,
      rootPath: core.projectRoot,
      configHash: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Fetch memory records
    const filesMap = core.fileRepo.getAllByProject(projectId);
    const files = Array.from(filesMap.values());
    const decisions = core.decisionRepo.listByProject(projectId);
    const edges = core.depRepo.getAllEdgesByProject(projectId);

    // Payload to encrypt
    const snapshotData = {
      project,
      files,
      decisions,
      edges,
      exportedAt: new Date().toISOString(),
    };

    const encryptedData = this.encryptPayload(snapshotData, passphrase);

    return {
      projectId: project.id,
      projectName: project.name,
      createdAt: new Date().toISOString(),
      encryptedData,
      metadata: {
        filesCount: files.length,
        decisionsCount: decisions.length,
        edgesCount: edges.length,
      },
    };
  }

  /**
   * Restores an encrypted backup archive into the local SQLite memory database.
   */
  public static async restoreBackup(
    core: NoReScanCore,
    archive: BackupArchive,
    passphrase = 'default-norescan-key'
  ): Promise<{ restoredFiles: number; restoredDecisions: number }> {
    const data = this.decryptPayload<{
      project: any;
      files: any[];
      decisions: any[];
      edges: any[];
    }>(archive.encryptedData, passphrase);

    const projectId = core.config?.projectId || archive.projectId || 'proj-1';
    let restoredFiles = 0;
    let restoredDecisions = 0;

    // 1. Restore files
    for (const f of data.files || []) {
      core.fileRepo.upsertFile({
        projectId,
        relativePath: f.relativePath || f.relative_path,
        contentHash: f.contentHash || f.content_hash,
        language: f.language,
        fileSize: f.fileSize || f.file_size || 0,
        status: 'valid',
        lastScannedAt: new Date().toISOString(),
      });
      restoredFiles++;
    }

    // 2. Restore decisions (ADRs)
    for (const d of data.decisions || []) {
      core.decisionRepo.recordDecision({
        projectId,
        title: d.title,
        decision: d.decision,
        rationale: d.rationale,
        affectedFiles: d.affectedFiles || d.affected_files || [],
      });
      restoredDecisions++;
    }

    defaultLogger.info(`Restored ${restoredFiles} files and ${restoredDecisions} ADRs from encrypted backup.`);
    return { restoredFiles, restoredDecisions };
  }
}
