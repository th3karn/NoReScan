import { AgentAdapter } from '../adapter.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const ANTIGRAVITY_RULE_BANNER = '<!-- BUGBRAIN:ANTIGRAVITY:START -->';
const ANTIGRAVITY_RULE_CONTENT = `
${ANTIGRAVITY_RULE_BANNER}
## BugBrain Persistent Memory Protocol
Before substantial coding tasks, use BugBrain MCP tools (\`get_task_context\`) or run \`bugbrain context "<task>"\` to retrieve verified file analyses and dependencies without repeating full codebase scans. Always inspect live source files before editing. After completing work, record architectural decisions using \`record_decision\`.
<!-- BUGBRAIN:ANTIGRAVITY:END -->
`;

export class AntigravityAdapter implements AgentAdapter {
  public readonly name = 'antigravity';
  public readonly displayName = 'Google Antigravity';
  public readonly description = 'Registers BugBrain MCP server in .gemini/antigravity/mcp/ and sets up workspace rules in AGENTS.md';

  public async install(projectRoot: string, dryRun = false): Promise<string[]> {
    const created: string[] = [];

    // 1. MCP Configuration
    const mcpDir = path.join(projectRoot, '.gemini', 'antigravity', 'mcp');
    const mcpFile = path.join(mcpDir, 'bugbrain.json');
    const mcpConfig = {
      mcpServers: {
        bugbrain: {
          command: 'bugbrain-mcp',
          args: [],
          env: {},
        },
      },
    };

    if (!dryRun) {
      await fs.mkdir(mcpDir, { recursive: true });
      await fs.writeFile(mcpFile, JSON.stringify(mcpConfig, null, 2), 'utf8');
    }
    created.push(mcpFile);

    // 2. Rules in AGENTS.md (idempotent)
    const agentsMdPath = path.join(projectRoot, 'AGENTS.md');
    let existingContent = '';
    try {
      existingContent = await fs.readFile(agentsMdPath, 'utf8');
    } catch {
      // file doesn't exist
    }

    if (!existingContent.includes(ANTIGRAVITY_RULE_BANNER)) {
      const newContent = existingContent
        ? `${existingContent.trim()}\n\n${ANTIGRAVITY_RULE_CONTENT.trim()}\n`
        : ANTIGRAVITY_RULE_CONTENT.trim() + '\n';
      if (!dryRun) {
        await fs.writeFile(agentsMdPath, newContent, 'utf8');
      }
      created.push(agentsMdPath);
    }

    return created;
  }

  public async uninstall(projectRoot: string, dryRun = false): Promise<string[]> {
    const removed: string[] = [];
    const mcpFile = path.join(projectRoot, '.gemini', 'antigravity', 'mcp', 'bugbrain.json');
    try {
      if (!dryRun) await fs.unlink(mcpFile);
      removed.push(mcpFile);
    } catch { }

    const agentsMdPath = path.join(projectRoot, 'AGENTS.md');
    try {
      const content = await fs.readFile(agentsMdPath, 'utf8');
      if (content.includes(ANTIGRAVITY_RULE_BANNER)) {
        const cleaned = content.replace(
          /<!-- BUGBRAIN:ANTIGRAVITY:START -->[\s\S]*?<!-- BUGBRAIN:ANTIGRAVITY:END -->/g,
          ''
        ).trim() + '\n';
        if (!dryRun) await fs.writeFile(agentsMdPath, cleaned, 'utf8');
        removed.push(agentsMdPath);
      }
    } catch { }

    return removed;
  }

  public async validate(projectRoot: string): Promise<boolean> {
    try {
      const mcpFile = path.join(projectRoot, '.gemini', 'antigravity', 'mcp', 'bugbrain.json');
      const content = await fs.readFile(mcpFile, 'utf8');
      return content.includes('bugbrain-mcp');
    } catch {
      return false;
    }
  }
}
