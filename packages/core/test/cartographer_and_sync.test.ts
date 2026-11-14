import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BugBrainCore } from '../src/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';

describe('Cartographer, Diff Blaster, Hybrid Sync & REST Server', () => {
  let tempDir: string;
  let core: BugBrainCore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bugbrain-cartographer-test-'));

    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'db.ts'),
      'export class Database { connect() {} }'
    );
    await fs.writeFile(
      path.join(tempDir, 'src', 'user.service.ts'),
      "import { Database } from './db.js';\nexport class UserService { constructor(private db: Database) {} }"
    );
    await fs.writeFile(
      path.join(tempDir, 'src', 'user.controller.ts'),
      "import { UserService } from './user.service.js';\nexport class UserController { constructor(private s: UserService) {} }"
    );

    core = new BugBrainCore(tempDir);
    await core.init('test-project');
    await core.scan();
  });

  afterEach(async () => {
    await core.stopRestServer();
    core.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('calculates causal graph with hot files ranking', () => {
    const graphData = core.getCausalGraph();
    expect(graphData.stats.totalFiles).toBeGreaterThanOrEqual(3);
    expect(graphData.hotFiles.length).toBeGreaterThan(0);

    // src/db.ts is imported by user.service.ts, which is imported by user.controller.ts
    const dbHot = graphData.hotFiles.find((h) => h.relativePath === 'src/db.ts');
    expect(dbHot?.inDegree).toBeGreaterThanOrEqual(1);

    const mermaid = core.cartographer.toMermaid();
    expect(mermaid).toContain('flowchart TD');

    const dot = core.cartographer.toDot();
    expect(dot).toContain('digraph BugBrainCausalGraph');
  });

  it('blasts a git diff and computes transitive upstream cone', () => {
    const sampleDiff = `diff --git a/src/db.ts b/src/db.ts
--- a/src/db.ts
+++ b/src/db.ts
@@ -1,2 +1,3 @@
- export class Database { connect() {} }
+ export class Database { connect(url: string) {} }`;

    const blast = core.blastDiff(sampleDiff);
    expect(blast.seedFiles).toContain('src/db.ts');
    expect(blast.blastCone).toContain('src/user.service.ts');
    expect(blast.blastCone).toContain('src/user.controller.ts');
    expect(blast.totalAffected).toBeGreaterThanOrEqual(2);
  });

  it('enqueues changes and prepares push payload for hybrid synchronization', () => {
    const statusBefore = core.getSyncStatus();
    expect(statusBefore.deviceId).toBeDefined();

    core.recordDecision({
      title: 'PostgreSQL Database Switch',
      decision: 'Migrate from SQLite to PostgreSQL in production',
      rationale: 'Concurrent write transactions',
      affectedFiles: ['src/db.ts'],
    });

    const pushPayload = core.pushSyncPayload();
    expect(pushPayload.projectId).toBeDefined();
    expect(pushPayload.records.decisions.some((d) => d.title === 'PostgreSQL Database Switch')).toBe(true);
    expect(pushPayload.records.files.some((f) => f.relativePath === 'src/db.ts')).toBe(true);
  });

  it('serves REST API and Cartographer HTML UI over HTTP', async () => {
    const serverInfo = await core.startRestServer({ port: 39123 });
    expect(serverInfo.url).toBe('http://127.0.0.1:39123');

    // Test GET /health
    const healthRes = await fetchJson(`${serverInfo.url}/health`);
    expect(healthRes.status).toBe('healthy');

    // Test GET /api/v1/hot-files
    const hotRes = await fetchJson(`${serverInfo.url}/api/v1/hot-files`);
    expect(Array.isArray(hotRes)).toBe(true);

    // Test POST /api/v1/blast-radius
    const blastRes = await postJson(`${serverInfo.url}/api/v1/blast-radius`, {
      files: ['src/db.ts'],
    });
    expect(blastRes.blastCone).toContain('src/user.service.ts');

    // Test GET / (HTML Dashboard)
    const htmlRes = await fetch(`${serverInfo.url}/`);
    const htmlText = await htmlRes.text();
    expect(htmlText).toContain('BugBrain');
    expect(htmlText).toContain('Causal graph');
    expect(htmlText).toContain('Blast a Diff');
  });
});

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
      res.on('error', reject);
    });
  });
}

function postJson(url: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(JSON.parse(data)));
        res.on('error', reject);
      }
    );
    req.write(body);
    req.end();
  });
}
