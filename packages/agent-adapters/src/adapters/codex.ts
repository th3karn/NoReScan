import { AgentAdapter } from '../adapter.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export class CodexAdapter implements AgentAdapter {
  public readonly name = 'codex';
  public readonly displayName = 'OpenAI Codex';
  public readonly description = 'Sets up CLI workflow instructions in AGENTS.md for OpenAI Codex';

  public async install(projectRoot: string, dryRun = false): Promise<string[]> {
    const agentsMdPath = path.join(projectRoot, 'AGENTS.md');
    const banner = '<!-- code-cache:CODEX:START -->';
    let existing = '';
    try {
      existing = await fs.readFile(agentsMdPath, 'utf8');
    } catch { }

    if (!existing.includes(banner)) {
      const instructions = `
${banner}
# code-cache Context Protocol for Codex
Run \`code-cache context "<task description>"\` before modifying code to review existing file analyses, dependency blast radius, and architectural decisions.
<!-- code-cache:CODEX:END -->
`;
      const updated = existing ? `${existing.trim()}\n\n${instructions.trim()}\n` : instructions.trim() + '\n';
      if (!dryRun) await fs.writeFile(agentsMdPath, updated, 'utf8');
      return [agentsMdPath];
    }
    return [];
  }

  public async uninstall(projectRoot: string, dryRun = false): Promise<string[]> {
    const agentsMdPath = path.join(projectRoot, 'AGENTS.md');
    try {
      const content = await fs.readFile(agentsMdPath, 'utf8');
      if (content.includes('<!-- code-cache:CODEX:START -->')) {
        const cleaned = content.replace(
          /<!-- code-cache:CODEX:START -->[\s\S]*?<!-- code-cache:CODEX:END -->/g,
          ''
        ).trim() + '\n';
        if (!dryRun) await fs.writeFile(agentsMdPath, cleaned, 'utf8');
        return [agentsMdPath];
      }
    } catch { }
    return [];
  }

  public async validate(projectRoot: string): Promise<boolean> {
    try {
      const agentsMdPath = path.join(projectRoot, 'AGENTS.md');
      const content = await fs.readFile(agentsMdPath, 'utf8');
      return content.includes('code-cache:CODEX');
    } catch {
      return false;
    }
  }
}
