import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { NoReScanCore } from '../src/core.js';
import { EncryptedMemoryEngine } from '../src/crypto.js';
import { BillingEngine, RazorpayProvider, PaddleProvider, StripeProvider } from '../src/billing.js';
import { TeamWorkspaceManager } from '../src/teams.js';
import { AuditLogger, EnterpriseVpcConfigurator } from '../src/enterprise.js';
import { ExtensionRegistry } from '../src/marketplace.js';

describe('Phases 3 to 6: Commercial & Enterprise Infrastructure Tests', () => {
  let tempDir: string;
  let core: NoReScanCore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'norescan-phases-test-'));
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src', 'index.ts'), 'export const app = 42;');
    await fs.writeFile(path.join(tempDir, 'package.json'), '{"name": "test-repo"}');

    core = new NoReScanCore(tempDir);
    await core.init('test-repo');
  });

  afterEach(async () => {
    core?.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // -----------------------------------------------------------
  // Phase 3: Cryptography & Encrypted Cloud Backup
  // -----------------------------------------------------------
  describe('Phase 3: AES-256-GCM Encrypted Backup & Restore', () => {
    it('encrypts and decrypts payloads accurately with AES-256-GCM', () => {
      const secretData = { sensitive: 'architecture-intel', symbolsCount: 128 };
      const passphrase = 'test-secret-password-123';

      const encrypted = EncryptedMemoryEngine.encryptPayload(secretData, passphrase);
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();

      const decrypted = EncryptedMemoryEngine.decryptPayload<typeof secretData>(encrypted, passphrase);
      expect(decrypted.sensitive).toBe('architecture-intel');
      expect(decrypted.symbolsCount).toBe(128);
    });

    it('rejects tampered encrypted payloads', () => {
      const encrypted = EncryptedMemoryEngine.encryptPayload({ foo: 'bar' }, 'secret');
      // Tamper with the ciphertext
      const corruptedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
      corruptedCiphertext[0] ^= 1;
      encrypted.ciphertext = corruptedCiphertext.toString('base64');

      expect(() => {
        EncryptedMemoryEngine.decryptPayload(encrypted, 'secret');
      }).toThrow();
    });

    it('creates an encrypted backup archive and restores it', async () => {
      // 1. Scan repo and record a decision
      await core.scan();
      core.decisionRepo.recordDecision({
        projectId: core.config.projectId,
        title: 'Use WAL Mode for SQLite',
        decision: 'Enable WAL mode',
        rationale: 'Concurrency',
        affectedFiles: ['src/index.ts'],
      });

      // 2. Create encrypted backup
      const backup = await EncryptedMemoryEngine.createBackup(core, 'my-vault-pass');
      expect(backup.metadata.filesCount).toBeGreaterThan(0);
      expect(backup.metadata.decisionsCount).toBeGreaterThan(0);
      expect(backup.encryptedData.ciphertext).toBeDefined();

      // 3. Restore backup
      const restoreResult = await EncryptedMemoryEngine.restoreBackup(core, backup, 'my-vault-pass');
      expect(restoreResult.restoredFiles).toBeGreaterThan(0);
      expect(restoreResult.restoredDecisions).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------
  // Phase 4: Billing & Provider Abstraction
  // -----------------------------------------------------------
  describe('Phase 4: Billing Engine & Signed Entitlements', () => {
    it('generates checkout sessions across Razorpay, Paddle, and Stripe', async () => {
      const billing = new BillingEngine();

      const rzpSession = await billing.createCheckout({ plan: 'pro', email: 'dev@lostgit.com' }, 'razorpay');
      expect(rzpSession.provider).toBe('razorpay');
      expect(rzpSession.currency).toBe('INR');
      expect(rzpSession.amountMinor).toBe(49900); // 499 INR

      const paddleSession = await billing.createCheckout({ plan: 'team', email: 'team@agency.com', seats: 3 }, 'paddle');
      expect(paddleSession.provider).toBe('paddle');
      expect(paddleSession.currency).toBe('USD');
      expect(paddleSession.amountMinor).toBe(4500); // $45 (3 x $15)
    });

    it('verifies webhook signatures and processes events idempotently', async () => {
      const billing = new BillingEngine();
      const secret = 'webhook-test-secret';
      const payload = JSON.stringify({
        id: 'evt_1001',
        event: 'subscription.charged',
        payload: {
          subscription: { entity: { id: 'sub_999' } },
        },
      });

      const crypto = await import('node:crypto');
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      // First run: processes
      const result1 = await billing.handleWebhook('razorpay', payload, signature, secret);
      expect(result1.processed).toBe(true);
      expect(result1.event.subscriptionId).toBe('sub_999');

      // Second run: idempotent skip
      const result2 = await billing.handleWebhook('razorpay', payload, signature, secret);
      expect(result2.processed).toBe(false);
    });

    it('creates and verifies cryptographically signed entitlements', () => {
      const billing = new BillingEngine();
      const signed = billing.createSignedEntitlement('pro', 'secret-key');
      expect(signed.signature).toBeDefined();
      expect(signed.features.cloudSync).toBe(true);

      const isValid = billing.verifySignedEntitlement(signed, 'secret-key');
      expect(isValid).toBe(true);

      // Verify wrong key fails
      const isInvalid = billing.verifySignedEntitlement(signed, 'wrong-key');
      expect(isInvalid).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // Phase 5: Team Workspace Collaboration & RBAC
  // -----------------------------------------------------------
  describe('Phase 5: Team Workspaces, RBAC & Centralized Agent Config', () => {
    it('manages organization lifecycle and enforces seat limits', () => {
      const teams = new TeamWorkspaceManager();
      const org = teams.createOrganization('LostGit Agency', 'usr_owner', 'team', 2);
      expect(org.seatsAllocated).toBe(2);

      // Owner is first member
      expect(teams.listMembers(org.id)).toHaveLength(1);

      // Invite second member
      const m2 = teams.inviteMember(org.id, 'dev1@lostgit.com', 'member');
      expect(m2.role).toBe('member');
      expect(teams.listMembers(org.id)).toHaveLength(2);

      // Third member exceeds seat limit (2 seats allocated)
      expect(() => {
        teams.inviteMember(org.id, 'dev2@lostgit.com', 'member');
      }).toThrow(/Seat limit reached/);
    });

    it('verifies role hierarchy permissions', () => {
      const teams = new TeamWorkspaceManager();
      expect(teams.verifyPermission('owner', 'admin')).toBe(true);
      expect(teams.verifyPermission('admin', 'member')).toBe(true);
      expect(teams.verifyPermission('member', 'admin')).toBe(false);
      expect(teams.verifyPermission('read_only', 'member')).toBe(false);
    });

    it('generates centralized agent configurations for teams', () => {
      const teams = new TeamWorkspaceManager();
      const org = teams.createOrganization('Acme Studio', 'usr_boss');
      const configs = teams.generateTeamAgentConfig(org);

      expect(configs.cursorRules).toContain('Acme Studio');
      expect(configs.cursorRules).toContain('norescan remember');
      expect(configs.agentsMd).toContain('Acme Studio');
      expect(configs.agentsMd).toContain('<!-- norescan:TEAM:START -->');
    });
  });

  // -----------------------------------------------------------
  // Phase 6: Enterprise Audit Log & Marketplace
  // -----------------------------------------------------------
  describe('Phase 6: Enterprise Audit Trail & Extension Marketplace', () => {
    it('maintains tamper-evident cryptographic hash chain for audit events', () => {
      const audit = new AuditLogger();

      audit.log({
        orgId: 'org_1',
        actorEmail: 'admin@corp.com',
        action: 'cloud_sync.push',
        resourceType: 'repository',
        resourceId: 'repo_99',
      });

      audit.log({
        orgId: 'org_1',
        actorEmail: 'dev@corp.com',
        action: 'adr.record',
        resourceType: 'decision',
        resourceId: 'dec_1',
      });

      const logs = audit.exportLogs();
      expect(logs).toHaveLength(2);
      expect(audit.verifyIntegrity()).toBe(true);

      // Tampering with an event breaks integrity
      logs[0].action = 'malicious_modification';
      expect(audit.verifyIntegrity()).toBe(false);
    });

    it('validates enterprise VPC self-hosted deployment requirements', () => {
      const valid = EnterpriseVpcConfigurator.validate({
        databaseUrl: 'postgresql://admin:secret@vpc-db.internal:5432/norescan',
        storageEndpoint: 'https://s3.internal.corp',
        storageBucket: 'norescan-memory-vault',
        ssoProvider: 'okta',
        airGapped: false,
      });
      expect(valid.healthy).toBe(true);
      expect(valid.errors).toHaveLength(0);

      const invalid = EnterpriseVpcConfigurator.validate({
        databaseUrl: 'sqlite://local.db', // Not allowed for enterprise VPC
        storageEndpoint: '',
        storageBucket: '',
        airGapped: true,
      });
      expect(invalid.healthy).toBe(false);
      expect(invalid.errors.length).toBeGreaterThan(0);
    });

    it('discovers built-in marketplace extensions and registers custom extensions', () => {
      const marketplace = new ExtensionRegistry();
      const extensions = marketplace.listExtensions();
      expect(extensions.length).toBeGreaterThanOrEqual(4);

      const pythonExt = marketplace.getExtension('@norescan/ext-python');
      expect(pythonExt?.author).toBe('LostGit Solutions');

      // Register custom extension
      marketplace.registerExtension({
        name: '@community/ext-graphql',
        version: '1.0.0',
        description: 'GraphQL schema AST analyzer and query resolver mapper',
        type: 'analyzer',
        author: 'Community',
        license: 'MIT',
      });

      const gql = marketplace.getExtension('@community/ext-graphql');
      expect(gql?.type).toBe('analyzer');
    });
  });
});
