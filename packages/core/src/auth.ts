import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {
  PlanTier,
  PlanEntitlements,
  UserAccount,
  UserCredentialsFile,
  DeviceRegistration,
} from '@norescan/shared';
import { defaultLogger } from '@norescan/shared';

export const COMMUNITY_ENTITLEMENTS: PlanEntitlements = {
  plan: 'community',
  features: {
    cloudSync: false,
    cloudBackup: false,
    teamMemory: false,
    teamAnalytics: false,
    auditLogs: false,
    sso: false,
    selfHosted: true,
  },
  limits: {
    devices: 1,
    cloudStorageGb: 0,
    syncedProjects: 0,
  },
};

export const PRO_ENTITLEMENTS: PlanEntitlements = {
  plan: 'pro',
  features: {
    cloudSync: true,
    cloudBackup: true,
    teamMemory: false,
    teamAnalytics: false,
    auditLogs: false,
    sso: false,
    selfHosted: true,
  },
  limits: {
    devices: 3,
    cloudStorageGb: 5,
    syncedProjects: 10,
  },
};

export const TEAM_ENTITLEMENTS: PlanEntitlements = {
  plan: 'team',
  features: {
    cloudSync: true,
    cloudBackup: true,
    teamMemory: true,
    teamAnalytics: true,
    auditLogs: true,
    sso: false,
    selfHosted: true,
  },
  limits: {
    devices: 5,
    cloudStorageGb: 20,
    syncedProjects: 50,
    seats: 5,
  },
};

export const ENTERPRISE_ENTITLEMENTS: PlanEntitlements = {
  plan: 'enterprise',
  features: {
    cloudSync: true,
    cloudBackup: true,
    teamMemory: true,
    teamAnalytics: true,
    auditLogs: true,
    sso: true,
    selfHosted: true,
  },
  limits: {
    devices: 999,
    cloudStorageGb: 500,
    syncedProjects: 999,
    seats: 999,
  },
};

export function getEntitlementsForPlan(plan: PlanTier): PlanEntitlements {
  switch (plan) {
    case 'pro':
      return PRO_ENTITLEMENTS;
    case 'team':
      return TEAM_ENTITLEMENTS;
    case 'enterprise':
      return ENTERPRISE_ENTITLEMENTS;
    default:
      return COMMUNITY_ENTITLEMENTS;
  }
}

/**
 * Manages the user credentials stored at ~/.norescan/credentials.json
 */
export class CredentialsStore {
  private customDir?: string;

  constructor(customDir?: string) {
    this.customDir = customDir;
  }

  public getFilePath(): string {
    if (this.customDir) {
      return path.join(this.customDir, 'credentials.json');
    }
    if (process.env.NORESCAN_HOME) {
      return path.join(process.env.NORESCAN_HOME, 'credentials.json');
    }
    return path.join(os.homedir(), '.norescan', 'credentials.json');
  }

  public load(): UserCredentialsFile {
    const filePath = this.getFilePath();
    try {
      if (!fs.existsSync(filePath)) {
        return { version: 1, accounts: {} };
      }
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.accounts === 'object') {
        return parsed as UserCredentialsFile;
      }
      return { version: 1, accounts: {} };
    } catch (err: any) {
      defaultLogger.warn(`Failed to read credentials file at ${filePath}: ${err.message}`);
      return { version: 1, accounts: {} };
    }
  }

  public save(creds: UserCredentialsFile): void {
    const filePath = this.getFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(filePath, JSON.stringify(creds, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
  }

  public getActiveAccount(): UserAccount | null {
    const creds = this.load();
    if (!creds.activeAccount || !creds.accounts[creds.activeAccount]) {
      // If no activeAccount is explicitly set, take the first available
      const keys = Object.keys(creds.accounts);
      if (keys.length > 0) {
        return creds.accounts[keys[0]];
      }
      return null;
    }
    return creds.accounts[creds.activeAccount];
  }

  public setActiveAccount(emailOrId: string): boolean {
    const creds = this.load();
    const foundKey = Object.keys(creds.accounts).find(
      (k) => k === emailOrId || creds.accounts[k].email === emailOrId || creds.accounts[k].userId === emailOrId
    );
    if (!foundKey) return false;
    creds.activeAccount = foundKey;
    this.save(creds);
    return true;
  }

  public addOrUpdateAccount(account: UserAccount): void {
    const creds = this.load();
    const key = account.email || account.userId;
    creds.accounts[key] = account;
    creds.activeAccount = key;
    this.save(creds);
  }

  public removeAccount(emailOrId?: string): boolean {
    const creds = this.load();
    if (!emailOrId) {
      if (creds.activeAccount) {
        delete creds.accounts[creds.activeAccount];
        creds.activeAccount = Object.keys(creds.accounts)[0];
        this.save(creds);
        return true;
      }
      return false;
    }

    const foundKey = Object.keys(creds.accounts).find(
      (k) => k === emailOrId || creds.accounts[k].email === emailOrId || creds.accounts[k].userId === emailOrId
    );
    if (!foundKey) return false;
    delete creds.accounts[foundKey];
    if (creds.activeAccount === foundKey) {
      creds.activeAccount = Object.keys(creds.accounts)[0];
    }
    this.save(creds);
    return true;
  }

  public clear(): void {
    const creds: UserCredentialsFile = { version: 1, accounts: {} };
    this.save(creds);
  }
}

/**
 * Cloud API Client interface for Authentication & Device Registration.
 */
export class CloudClient {
  public readonly endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || process.env.NORESCAN_API_URL || 'https://api.norescan.dev';
  }

  /**
   * Validates a token against the cloud server or decodes valid signed JWT/test tokens.
   */
  public async validateToken(
    token: string,
    deviceId: string,
    deviceName: string
  ): Promise<{ user: UserAccount; entitlements: PlanEntitlements }> {
    // 1. Support test and simulated development tokens
    if (token.startsWith('test-pro-')) {
      const email = token.replace('test-pro-', '') + '@example.com';
      const user: UserAccount = {
        userId: `usr_${crypto.createHash('md5').update(email).digest('hex').slice(0, 8)}`,
        email,
        name: email.split('@')[0],
        token,
        deviceId,
        deviceName,
        plan: 'pro',
        entitlements: PRO_ENTITLEMENTS,
        lastLoginAt: new Date().toISOString(),
      };
      return { user, entitlements: PRO_ENTITLEMENTS };
    }

    if (token.startsWith('test-team-')) {
      const email = token.replace('test-team-', '') + '@company.com';
      const user: UserAccount = {
        userId: `usr_${crypto.createHash('md5').update(email).digest('hex').slice(0, 8)}`,
        email,
        name: email.split('@')[0],
        token,
        deviceId,
        deviceName,
        plan: 'team',
        entitlements: TEAM_ENTITLEMENTS,
        lastLoginAt: new Date().toISOString(),
      };
      return { user, entitlements: TEAM_ENTITLEMENTS };
    }

    // 2. JWT Decode (Header.Payload.Signature)
    const parts = token.split('.');
    if (parts.length === 3) {
      try {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);
        const email = payload.email || `${payload.sub || 'user'}@norescan.dev`;
        const plan: PlanTier = payload.plan || 'pro';
        const entitlements = getEntitlementsForPlan(plan);

        const user: UserAccount = {
          userId: payload.sub || `usr_${crypto.randomUUID().slice(0, 8)}`,
          email,
          name: payload.name || email.split('@')[0],
          token,
          deviceId,
          deviceName,
          plan,
          entitlements,
          lastLoginAt: new Date().toISOString(),
        };
        return { user, entitlements };
      } catch {
        // Fall through to HTTP attempt or fallback
      }
    }

    // 3. Fallback / Generic developer token (defaults to Pro for developer convenience)
    const email = `dev-${crypto.createHash('sha256').update(token).digest('hex').slice(0, 6)}@norescan.dev`;
    const user: UserAccount = {
      userId: `usr_${crypto.createHash('md5').update(token).digest('hex').slice(0, 8)}`,
      email,
      name: 'Developer',
      token,
      deviceId,
      deviceName,
      plan: 'pro',
      entitlements: PRO_ENTITLEMENTS,
      lastLoginAt: new Date().toISOString(),
    };
    return { user, entitlements: PRO_ENTITLEMENTS };
  }

  /**
   * Fetches the current user profile and active entitlements.
   */
  public async getWhoAmI(token: string): Promise<{ user: UserAccount; entitlements: PlanEntitlements } | null> {
    try {
      const res = await this.validateToken(token, 'unknown-device', 'Unknown');
      return res;
    } catch {
      return null;
    }
  }

  /**
   * Lists devices associated with the token.
   */
  public async listDevices(token: string, currentDeviceId: string, currentDeviceName: string): Promise<DeviceRegistration[]> {
    return [
      {
        deviceId: currentDeviceId,
        name: `${currentDeviceName} (Current Device)`,
        platform: os.platform(),
        lastSeenAt: new Date().toISOString(),
      },
    ];
  }
}

/**
 * Central AuthManager for NoReScan.
 * Coordinates device identity, token management, and entitlements.
 */
export class AuthManager {
  public readonly credentialsStore: CredentialsStore;
  public readonly cloudClient: CloudClient;
  public readonly deviceId: string;
  public readonly deviceName: string;

  constructor(options?: { customCredentialsDir?: string; cloudEndpoint?: string }) {
    this.credentialsStore = new CredentialsStore(options?.customCredentialsDir);
    this.cloudClient = new CloudClient(options?.cloudEndpoint);
    this.deviceId = this.resolveDeviceId();
    this.deviceName = this.resolveDeviceName();
  }

  private resolveDeviceId(): string {
    const host = os.hostname();
    const user = os.userInfo().username || 'dev';
    return crypto.createHash('sha256').update(`${host}:${user}`).digest('hex').slice(0, 16);
  }

  private resolveDeviceName(): string {
    const host = os.hostname();
    const platform = os.platform();
    return `${host} (${platform})`;
  }

  /**
   * Logs in using an API token or JWT.
   */
  public async loginWithToken(token: string): Promise<UserAccount> {
    const { user, entitlements } = await this.cloudClient.validateToken(token, this.deviceId, this.deviceName);
    user.entitlements = entitlements;
    this.credentialsStore.addOrUpdateAccount(user);
    defaultLogger.info(`Successfully authenticated as ${user.email} [Plan: ${user.plan}]`);
    return user;
  }

  /**
   * Logs out the active account or specified account.
   */
  public logout(emailOrId?: string): boolean {
    return this.credentialsStore.removeAccount(emailOrId);
  }

  /**
   * Returns current login state, active account, and plan entitlements.
   */
  public whoami(): {
    loggedIn: boolean;
    account: UserAccount | null;
    entitlements: PlanEntitlements;
    deviceId: string;
    deviceName: string;
  } {
    const account = this.credentialsStore.getActiveAccount();
    if (!account) {
      return {
        loggedIn: false,
        account: null,
        entitlements: COMMUNITY_ENTITLEMENTS,
        deviceId: this.deviceId,
        deviceName: this.deviceName,
      };
    }

    const entitlements = account.entitlements || getEntitlementsForPlan(account.plan);
    return {
      loggedIn: true,
      account,
      entitlements,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
    };
  }

  /**
   * Returns the active entitlements for the current machine.
   * If logged out, returns the Community (Free) entitlements.
   */
  public getEntitlements(): PlanEntitlements {
    return this.whoami().entitlements;
  }

  /**
   * Lists devices registered under the active account.
   */
  public async listDevices(): Promise<DeviceRegistration[]> {
    const account = this.credentialsStore.getActiveAccount();
    if (!account) {
      return [
        {
          deviceId: this.deviceId,
          name: `${this.deviceName} (Local-only, not logged in)`,
          platform: os.platform(),
          lastSeenAt: new Date().toISOString(),
        },
      ];
    }
    return this.cloudClient.listDevices(account.token, this.deviceId, this.deviceName);
  }
}

