import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMcpServer } from '../src/server.js';
import { RepoMindCore } from '@repomind/core';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('RepoMind MCP Server Protocol Tests', () => {
  let tempDir: string;
  let core: RepoMindCore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomind-mcp-test-'));

    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'auth.ts'),
      'export function login() { return true; }'
    );
    await fs.writeFile(path.join(tempDir, 'package.json'), '{"name": "mcp-demo"}');

    core = new RepoMindCore(tempDir);
    await core.init('mcp-demo');
    await core.scan();
  });

  afterEach(async () => {
    core.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('lists registered tools and resources', async () => {
    const server = createMcpServer(core);

    // Test ListTools
    const toolsHandler = (server as any)._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
    expect(toolsHandler).toBeDefined();

    const toolsResult = await toolsHandler({ method: 'tools/list', params: {} });
    const toolNames = toolsResult.tools.map((t: any) => t.name);

    expect(toolNames).toContain('get_project_overview');
    expect(toolNames).toContain('get_project_status');
    expect(toolNames).toContain('get_task_context');
    expect(toolNames).toContain('get_file_analysis');
    expect(toolNames).toContain('record_decision');
    expect(toolNames).toContain('record_session');

    // Test ListResources
    const resourcesHandler = (server as any)._requestHandlers.get(ListResourcesRequestSchema.shape.method.value);
    const resourcesResult = await resourcesHandler({ method: 'resources/list', params: {} });
    const uris = resourcesResult.resources.map((r: any) => r.uri);

    expect(uris).toContain('repomind://project/overview');
    expect(uris).toContain('repomind://project/status');
    expect(uris).toContain('repomind://project/decisions');
  });

  it('executes get_task_context tool call cleanly', async () => {
    const server = createMcpServer(core);
    const callHandler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const result = await callHandler({
      method: 'tools/call',
      params: {
        name: 'get_task_context',
        arguments: {
          query: 'Implement user login',
          format: 'markdown',
        },
      },
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('RepoMind Context Manifest');
    expect(result.content[0].text).toContain('src/auth.ts');
  });

  it('records decisions and reads them via MCP resources', async () => {
    const server = createMcpServer(core);
    const callHandler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    // Call record_decision tool
    const recordResult = await callHandler({
      method: 'tools/call',
      params: {
        name: 'record_decision',
        arguments: {
          title: 'Use Argon2 for password hashing',
          decision: 'Hash passwords with Argon2id',
          rationale: 'NIST recommendation',
          affectedFiles: ['src/auth.ts'],
        },
      },
    });

    expect(recordResult.content[0].text).toContain('Use Argon2 for password hashing');

    // Read decisions resource
    const resourceHandler = (server as any)._requestHandlers.get(ReadResourceRequestSchema.shape.method.value);
    const readResult = await resourceHandler({
      method: 'resources/read',
      params: { uri: 'repomind://project/decisions' },
    });

    const parsedDecisions = JSON.parse(readResult.contents[0].text);
    expect(parsedDecisions).toHaveLength(1);
    expect(parsedDecisions[0].title).toBe('Use Argon2 for password hashing');
  });
});
