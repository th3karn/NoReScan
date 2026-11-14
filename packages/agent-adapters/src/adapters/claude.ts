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
    } catch { }

    config.mcpServers.bugbrain = {
      command: 'bugbrain-mcp',
      args: [],
    };

    if (!dryRun) {
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf8');
    }
    created.push(configFile);

    // 2. CLAUDE.md
    const claudeMd = path.join(projectRoot, 'CLAUDE.md');
    const banner = '<!-- BUGBRAIN:CLAUDE:START -->';
    let existing = '';
    try {
      existing = await fs.readFile(claudeMd, 'utf8');
    } catch { }

    if (!existing.includes(banner)) {
      const instructions = `
${banner}
# BugBrain Persistent Memory
- Before starting substantial tasks, call \`get_task_context\` to retrieve relevant files and avoid re-analyzing unchanged files.
- Inspect live source files before writing edits.
- Record architectural decisions using \`record_decision\`.
<!-- BUGBRAIN:CLAUDE:END -->
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
      if (parsed.mcpServers?.bugbrain) {
        delete parsed.mcpServers.bugbrain;
        if (!dryRun) await fs.writeFile(configFile, JSON.stringify(parsed, null, 2), 'utf8');
        removed.push(configFile);
      }
    } catch { }

    const claudeMd = path.join(projectRoot, 'CLAUDE.md');
    try {
      const content = await fs.readFile(claudeMd, 'utf8');
      if (content.includes('<!-- BUGBRAIN:CLAUDE:START -->')) {
        const cleaned = content.replace(
          /<!-- BUGBRAIN:CLAUDE:START -->[\s\S]*?<!-- BUGBRAIN:CLAUDE:END -->/g,
          ''
        ).trim() + '\n';
        if (!dryRun) await fs.writeFile(claudeMd, cleaned, 'utf8');
        removed.push(claudeMd);
      }
    } catch { }

    return removed;
  }

  public async validate(projectRoot: string): Promise<boolean> {
    try {
      const configFile = path.join(projectRoot, '.claude', 'config.json');
      const content = await fs.readFile(configFile, 'utf8');
      return content.includes('bugbrain-mcp');
    } catch {
      return false;
    }
  }
}
