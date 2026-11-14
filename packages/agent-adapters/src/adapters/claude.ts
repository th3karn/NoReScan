import { AgentAdapter } from '../adapter.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export class ClaudeCodeAdapter implements AgentAdapter {
  public readonly name = 'claude-code';
  public readonly displayName = 'Claude Code';
  public readonly description = 'Configures Claude Code project MCP server in .claude/config.json and CLAUDE.md';

  public async install(projectRoot: string, dryRun = false): Promise<string[]> {
    const created: string[] = [];

    // 1. .claude/config.json
    const claudeDir = path.join(projectRoot, '.claude');
    const configFile = path.join(claudeDir, 'config.json');
    let config: any = { mcpServers: {} };
    try {
      const existing = await fs.readFile(configFile, 'utf8');
      config = JSON.parse(existing);
      if (!config.mcpServers) config.mcpServers = {};
    } catch {}

    config.mcpServers.repomind = {
      command: 'repomind-mcp',
      args: [],
    };

    if (!dryRun) {
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf8');
    }
    created.push(configFile);

    // 2. CLAUDE.md
    const claudeMd = path.join(projectRoot, 'CLAUDE.md');
    const banner = '<!-- REPOMIND:CLAUDE:START -->';
    let existing = '';
    try {
      existing = await fs.readFile(claudeMd, 'utf8');
    } catch {}

    if (!existing.includes(banner)) {
      const instructions = `
${banner}
# RepoMind Persistent Memory
- Before starting substantial tasks, call \`get_task_context\` to retrieve relevant files and avoid re-analyzing unchanged files.
- Inspect live source files before writing edits.
- Record architectural decisions using \`record_decision\`.
<!-- REPOMIND:CLAUDE:END -->
`;
      const updated = existing ? `${existing.trim()}\n\n${instructions.trim()}\n` : instructions.trim() + '\n';
      if (!dryRun) await fs.writeFile(claudeMd, updated, 'utf8');
      created.push(claudeMd);
    }

    return created;
  }

  public async uninstall(projectRoot: string, dryRun = false): Promise<string[]> {
    const removed: string[] = [];
    const configFile = path.join(projectRoot, '.claude', 'config.json');
    try {
      const content = await fs.readFile(configFile, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed.mcpServers?.repomind) {
        delete parsed.mcpServers.repomind;
        if (!dryRun) await fs.writeFile(configFile, JSON.stringify(parsed, null, 2), 'utf8');
        removed.push(configFile);
      }
    } catch {}

    return removed;
  }

  public async validate(projectRoot: string): Promise<boolean> {
    try {
      const configFile = path.join(projectRoot, '.claude', 'config.json');
      const content = await fs.readFile(configFile, 'utf8');
      return content.includes('repomind');
    } catch {
      return false;
    }
  }
}
