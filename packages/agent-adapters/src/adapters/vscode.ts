import { AgentAdapter } from '../adapter.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export class VSCodeAdapter implements AgentAdapter {
  public readonly name = 'vscode';
  public readonly displayName = 'VS Code / GitHub Copilot';
  public readonly description = 'Configures .vscode/mcp.json and .github/copilot-instructions.md';

  public async install(projectRoot: string, dryRun = false): Promise<string[]> {
    const created: string[] = [];

    // 1. .vscode/mcp.json
    const vscodeDir = path.join(projectRoot, '.vscode');
    const mcpFile = path.join(vscodeDir, 'mcp.json');
    let mcpConfig: any = { mcpServers: {} };
    try {
      const existing = await fs.readFile(mcpFile, 'utf8');
      mcpConfig = JSON.parse(existing);
      if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};
    } catch { }

    mcpConfig.mcpServers.bugbrain = {
      command: 'bugbrain-mcp',
      args: [],
    };

    if (!dryRun) {
      await fs.mkdir(vscodeDir, { recursive: true });
      await fs.writeFile(mcpFile, JSON.stringify(mcpConfig, null, 2), 'utf8');
    }
    created.push(mcpFile);

    // 2. .github/copilot-instructions.md
    const githubDir = path.join(projectRoot, '.github');
    const copilotFile = path.join(githubDir, 'copilot-instructions.md');
    const banner = '<!-- BUGBRAIN:COPILOT:START -->';
    let existing = '';
    try {
      existing = await fs.readFile(copilotFile, 'utf8');
    } catch { }

    if (!existing.includes(banner)) {
      const instructions = `
${banner}
# BugBrain Context Protocol
Query BugBrain (\`bugbrain context "<task>"\`) before modifying code to inspect cached structural summaries, routes, and dependency relationships.
<!-- BUGBRAIN:COPILOT:END -->
`;
      const updated = existing ? `${existing.trim()}\n\n${instructions.trim()}\n` : instructions.trim() + '\n';
      if (!dryRun) {
        await fs.mkdir(githubDir, { recursive: true });
        await fs.writeFile(copilotFile, updated, 'utf8');
      }
      created.push(copilotFile);
    }

    return created;
  }

  public async uninstall(projectRoot: string, dryRun = false): Promise<string[]> {
    const removed: string[] = [];
    const mcpFile = path.join(projectRoot, '.vscode', 'mcp.json');
    try {
      const content = await fs.readFile(mcpFile, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed.mcpServers?.bugbrain) {
        delete parsed.mcpServers.bugbrain;
        if (!dryRun) await fs.writeFile(mcpFile, JSON.stringify(parsed, null, 2), 'utf8');
        removed.push(mcpFile);
      }
    } catch { }

    return removed;
  }

  public async validate(projectRoot: string): Promise<boolean> {
    try {
      const mcpFile = path.join(projectRoot, '.vscode', 'mcp.json');
      const content = await fs.readFile(mcpFile, 'utf8');
      return content.includes('bugbrain-mcp');
    } catch {
      return false;
    }
  }
}
