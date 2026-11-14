import { AgentAdapter } from './adapter.js';
import { AntigravityAdapter } from './adapters/antigravity.js';
import { CursorAdapter } from './adapters/cursor.js';
import { ClaudeCodeAdapter } from './adapters/claude.js';
import { CodexAdapter } from './adapters/codex.js';
import { VSCodeAdapter } from './adapters/vscode.js';

export * from './adapter.js';
export * from './adapters/antigravity.js';
export * from './adapters/cursor.js';
export * from './adapters/claude.js';
export * from './adapters/codex.js';
export * from './adapters/vscode.js';

const ADAPTER_REGISTRY: Record<string, AgentAdapter> = {
  antigravity: new AntigravityAdapter(),
  cursor: new CursorAdapter(),
  'claude-code': new ClaudeCodeAdapter(),
  codex: new CodexAdapter(),
  vscode: new VSCodeAdapter(),
};

export function getAdapter(name: string): AgentAdapter | undefined {
  return ADAPTER_REGISTRY[name.toLowerCase()];
}

export function getAllAdapters(): AgentAdapter[] {
  return Object.values(ADAPTER_REGISTRY);
}

