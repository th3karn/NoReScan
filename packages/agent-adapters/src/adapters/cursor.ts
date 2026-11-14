import { AgentAdapter } from '../adapter.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export class CursorAdapter implements AgentAdapter {
  public readonly name = 'cursor';
  public readonly displayName = 'Cursor / Windsurf';
  public readonly description = 'Configures Cursor project MCP server in .cursor/mcp.json and rules in .cursor/rules/norescan.mdc';

  public async install(projectRoot: string, dryRun = false): Promise<string[]> {
    const created: string[] = [];

    // 1. .cursor/mcp.json
    const cursorDir = path.join(projectRoot, '.cursor');
    const mcpFile = path.join(cursorDir, 'mcp.json');
    let mcpConfig: any = { mcpServers: {} };
    try {
      const existing = await fs.readFile(mcpFile, 'utf8');
      mcpConfig = JSON.parse(existing);
      if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};
    } catch { }

    mcpConfig.mcpServers['norescan'] = {
      command: 'norescan-mcp',
      args: [],
    };

    if (!dryRun) {
      await fs.mkdir(cursorDir, { recursive: true });
      await fs.writeFile(mcpFile, JSON.stringify(mcpConfig, null, 2), 'utf8');
    }
    created.push(mcpFile);

    // 2. .cursor/rules/norescan.mdc
    const rulesDir = path.join(cursorDir, 'rules');
    const ruleFile = path.join(rulesDir, 'norescan.mdc');
    const ruleContent = `---
description: norescan Persistent Codebase Memory Rules
globs: *
---
Before major refactoring or implementing features:
- Query norescan via MCP tools (get_task_context) to retrieve relevant files and dependencies.
- Avoid re-analyzing unchanged files when verified cached knowledge is available.
- Read physical source code before writing edits.
- Record architectural decisions using record_decision.
`;

    if (!dryRun) {
      await fs.mkdir(rulesDir, { recursive: true });
      await fs.writeFile(ruleFile, ruleContent, 'utf8');
    }
    created.push(ruleFile);

    return created;
  }

  public async uninstall(projectRoot: string, dryRun = false): Promise<string[]> {
    const removed: string[] = [];
    const mcpFile = path.join(projectRoot, '.cursor', 'mcp.json');
    try {
      const content = await fs.readFile(mcpFile, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed.mcpServers?.['norescan']) {
        delete parsed.mcpServers['norescan'];
        if (!dryRun) await fs.writeFile(mcpFile, JSON.stringify(parsed, null, 2), 'utf8');
        removed.push(mcpFile);
      }
    } catch { }

    const ruleFile = path.join(projectRoot, '.cursor', 'rules', 'norescan.mdc');
    try {
      if (!dryRun) await fs.unlink(ruleFile);
      removed.push(ruleFile);
    } catch { }

    return removed;
  }

  public async validate(projectRoot: string): Promise<boolean> {
    try {
      const mcpFile = path.join(projectRoot, '.cursor', 'mcp.json');
      const content = await fs.readFile(mcpFile, 'utf8');
      return content.includes('norescan-mcp');
    } catch {
      return false;
    }
  }
}
