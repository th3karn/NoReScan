#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { RepoMindCore } from '@repomind/core';
import { createMcpServer } from './server.js';

async function main() {
  const projectRoot = process.env.REPOMIND_PROJECT || process.cwd();
  const core = new RepoMindCore(projectRoot);
  const config = await core.loadConfig();

  if (!config) {
    // If not yet initialized, auto-initialize
    await core.init();
  }

  const server = createMcpServer(core);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  process.stderr.write(`RepoMind MCP server running on stdio for project: ${core.config.projectName}\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal MCP error: ${err.message}\n`);
  process.exit(1);
});
