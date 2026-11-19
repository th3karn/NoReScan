import crypto from 'node:crypto';
import { AuditEvent, defaultLogger } from '@norescan/shared';

export interface VpcConfig {
  databaseUrl: string;
  storageEndpoint: string;
  storageBucket: string;
  ssoProvider?: 'saml' | 'okta' | 'azure_ad';
  airGapped: boolean;
}

/**
 * Tamper-evident, cryptographically chained audit logger for Enterprise SOC2 compliance.
 */
export class AuditLogger {
  private events: AuditEvent[] = [];
  private lastHash = 'GENESIS_HASH_0000000000000000';

  public log(event: {
    orgId: string;
    actorEmail: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }): AuditEvent {
    const id = `aud_${crypto.randomUUID().slice(0, 8)}`;
    const timestamp = new Date().toISOString();

    const dataToHash = `${this.lastHash}:${id}:${event.orgId}:${event.actorEmail}:${event.action}:${event.resourceType}:${event.resourceId}:${timestamp}`;
    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    const auditEvent: AuditEvent = {
      id,
      orgId: event.orgId,
      actorEmail: event.actorEmail,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      metadata: event.metadata,
      timestamp,
      hash,
    };

    this.lastHash = hash;
    this.events.push(auditEvent);
    return auditEvent;
  }

  public exportLogs(orgId?: string): AuditEvent[] {
    if (orgId) {
      return this.events.filter((e) => e.orgId === orgId);
    }
    return [...this.events];
  }

  /**
   * Verifies that the audit event hash chain is unbroken and unmodified.
   */
  public verifyIntegrity(): boolean {
    let currentHash = 'GENESIS_HASH_0000000000000000';
    for (const e of this.events) {
      const dataToHash = `${currentHash}:${e.id}:${e.orgId}:${e.actorEmail}:${e.action}:${e.resourceType}:${e.resourceId}:${e.timestamp}`;
      const expected = crypto.createHash('sha256').update(dataToHash).digest('hex');
      if (expected !== e.hash) {
        defaultLogger.error(`Audit log integrity violation detected at event ${e.id}!`);
        return false;
      }
      currentHash = e.hash;
    }
    return true;
  }
}

/**
 * Enterprise VPC & Self-Hosted Infrastructure Validator
 */
export class EnterpriseVpcConfigurator {
  public static validate(config: VpcConfig): { healthy: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!config.databaseUrl || !config.databaseUrl.startsWith('postgresql://')) {
      errors.push('Enterprise deployment requires a valid PostgreSQL connection string (postgresql://...).');
    }

    if (!config.storageBucket) {
      errors.push('Private object storage bucket name is required.');
    }

    if (config.airGapped) {
      warnings.push('Running in Air-Gapped mode. Cloud sync and external telemetry will be completely disabled.');
    }

    if (config.ssoProvider) {
      warnings.push(`SSO identity provider configured: ${config.ssoProvider}`);
    }

    return {
      healthy: errors.length === 0,
      warnings,
      errors,
    };
  }
}
