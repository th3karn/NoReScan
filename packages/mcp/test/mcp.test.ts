import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMcpServer } from '../src/server.js';
import { CodeCacheCore } from '@code-cache/core';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('code-cache MCP Server Protocol Tests', () => {
  let tempDir: string;
  let core: CodeCacheCore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-cache-mcp-test-'));

    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'auth.ts'),
      'export function login() { return true; }'
    );
    await fs.writeFile(path.join(tempDir, 'package.json'), '{"name": "mcp-demo"}');

    core = new CodeCacheCore(tempDir);
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
    expect(toolNames).toContain('get_blast_radius');
    expect(toolNames).toContain('get_hot_files');
    expect(toolNames).toContain('search_project_memory');
    expect(toolNames).toContain('get_changed_files');
    expect(toolNames).toContain('refresh_analysis');
    expect(toolNames).toContain('record_decision');
    expect(toolNames).toContain('record_session');
    expect(toolNames).toContain('get_languages');
    expect(toolNames).toContain('get_ecosystems');
    expect(toolNames).toContain('get_causal_graph');
    expect(toolNames).toContain('blast_diff');
    expect(toolNames).toContain('get_sync_status');
    expect(toolNames.length).toBe(24);

    // Test ListResources
    const resourcesHandler = (server as any)._requestHandlers.get(ListResourcesRequestSchema.shape.method.value);
    const resourcesResult = await resourcesHandler({ method: 'resources/list', params: {} });
    const uris = resourcesResult.resources.map((r: any) => r.uri);

    expect(uris).toContain('code-cache://project/overview');
    expect(uris).toContain('code-cache://project/status');
    expect(uris).toContain('code-cache://project/decisions');
    expect(uris).toContain('code-cache://project/dependencies');
    expect(uris).toContain('code-cache://project/hot-files');
    expect(uris).toContain('code-cache://project/schema');
    expect(uris).toContain('code-cache://project/languages');
    expect(uris).toContain('code-cache://project/causal-graph');
    expect(uris).toContain('code-cache://project/sync');
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
    expect(result.content[0].text).toContain('code-cache Context Manifest');
    expect(result.content[0].text).toContain('src/auth.ts');
  });

  it('executes get_hot_files and search_project_memory tools cleanly', async () => {
    const server = createMcpServer(core);
    const callHandler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const hotResult = await callHandler({
      method: 'tools/call',
      params: {
        name: 'get_hot_files',
        arguments: { limit: 5 },
      },
    });
    expect(hotResult.content[0].type).toBe('text');

    const searchResult = await callHandler({
      method: 'tools/call',
      params: {
        name: 'search_project_memory',
        arguments: { query: 'login' },
      },
    });
    const parsedSearch = JSON.parse(searchResult.content[0].text);
    expect(parsedSearch.symbols.some((s: any) => s.name === 'login')).toBe(true);
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
      params: { uri: 'code-cache://project/decisions' },
    });

    const parsedDecisions = JSON.parse(readResult.contents[0].text);
    expect(parsedDecisions).toHaveLength(1);
    expect(parsedDecisions[0].title).toBe('Use Argon2 for password hashing');
  });
});
