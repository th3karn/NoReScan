import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import {
  AuthManager,
  CredentialsStore,
  CloudClient,
  COMMUNITY_ENTITLEMENTS,
  PRO_ENTITLEMENTS,
  TEAM_ENTITLEMENTS,
} from '../src/auth.js';

describe('AuthManager & Cloud Identity (Phase 2)', () => {
  let tempHome: string;
  let auth: AuthManager;

  beforeEach(async () => {
    tempHome = path.join(os.tmpdir(), `norescan-auth-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    await fs.mkdir(tempHome, { recursive: true });
    auth = new AuthManager({ customCredentialsDir: tempHome });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempHome, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('starts in unauthenticated Community mode by default', () => {
    const status = auth.whoami();
    expect(status.loggedIn).toBe(false);
    expect(status.account).toBeNull();
    expect(status.entitlements.plan).toBe('community');
    expect(status.entitlements.features.cloudSync).toBe(false);
    expect(status.deviceId).toBeDefined();
    expect(status.deviceName).toBeDefined();
  });

  it('authenticates with a Pro token and persists credentials', async () => {
    const user = await auth.loginWithToken('test-pro-alex');
    expect(user.email).toBe('alex@example.com');
    expect(user.plan).toBe('pro');
    expect(user.entitlements?.features.cloudSync).toBe(true);
    expect(user.entitlements?.limits.devices).toBe(3);

    // Verify persisted credentials
    const status = auth.whoami();
    expect(status.loggedIn).toBe(true);
    expect(status.account?.email).toBe('alex@example.com');
    expect(status.entitlements.plan).toBe('pro');

    // Create a new instance using the same directory and ensure state is reloaded
    const reloadedAuth = new AuthManager({ customCredentialsDir: tempHome });
    const reloadedStatus = reloadedAuth.whoami();
    expect(reloadedStatus.loggedIn).toBe(true);
    expect(reloadedStatus.account?.email).toBe('alex@example.com');
  });

  it('authenticates with a Team token and attaches team entitlements', async () => {
    const user = await auth.loginWithToken('test-team-lead');
    expect(user.email).toBe('lead@company.com');
    expect(user.plan).toBe('team');
    expect(user.entitlements?.features.teamMemory).toBe(true);
    expect(user.entitlements?.limits.seats).toBe(5);

    const entitlements = auth.getEntitlements();
    expect(entitlements.plan).toBe('team');
    expect(entitlements.features.cloudBackup).toBe(true);
    expect(entitlements.features.teamAnalytics).toBe(true);
  });

  it('lists registered devices for active account', async () => {
    await auth.loginWithToken('test-pro-alex');
    const devices = await auth.listDevices();
    expect(devices.length).toBeGreaterThan(0);
    expect(devices[0].deviceId).toBe(auth.deviceId);
    expect(devices[0].platform).toBe(os.platform());
  });

  it('logs out and clears active account credentials', async () => {
    await auth.loginWithToken('test-pro-alex');
    expect(auth.whoami().loggedIn).toBe(true);

    const loggedOut = auth.logout();
    expect(loggedOut).toBe(true);

    const status = auth.whoami();
    expect(status.loggedIn).toBe(false);
    expect(status.account).toBeNull();
    expect(status.entitlements.plan).toBe('community');
  });
});

