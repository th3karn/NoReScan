# code-cache — Universal Agent Integration Matrix

**Organization:** LostGit Solutions  
**Version:** 1.0.0-draft  

---

## 1. Agent Support Matrix

| Agent / Environment | Transport | Discovery Location | Rules Location | Skills Location | Installation Support |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Antigravity** | `stdio` MCP | `.gemini/antigravity/mcp/code-cache.json` or project MCP | `AGENTS.md` | `.agents/skills/code-cache-memory/` | Full Automated (`code-cache agent install antigravity`) |
| **Cursor** | `stdio` MCP | `.cursor/mcp.json` | `.cursor/rules/code-cache.mdc` or `.cursorrules` | `.cursor/skills/code-cache-memory/` | Full Automated (`code-cache agent install cursor`) |
| **Claude Code** | `stdio` MCP | `claude mcp add` / `.claude/config.json` | `CLAUDE.md` | `.claude/skills/code-cache-memory/` | Full Automated (`code-cache agent install claude-code`) |
| **OpenAI Codex / Copilot** | CLI stdio | Direct CLI invocation | `AGENTS.md` | N/A (CLI commands) | Instruction Scaffolding (`code-cache agent install codex`) |
| **VS Code (Generic)** | `stdio` MCP | `.vscode/mcp.json` (where supported) | `.github/copilot-instructions.md` | N/A | Full Automated (`code-cache agent install vscode`) |

---

## 2. Capabilities by Integration Type

| Capability | Stdio MCP | Agent Skill | Direct CLI Fallback |
| :--- | :---: | :---: | :---: |
| **Context on Demand** | Yes (`get_task_context`) | Yes (`code-cache context`) | Yes (`code-cache context`) |
| **Structural File Analysis**| Yes (`get_file_analysis`) | Yes (`code-cache explain`) | Yes (`code-cache explain`) |
| **Dependency Traversal** | Yes (`get_dependencies`) | Yes (`code-cache diff`) | Yes (`code-cache diff`) |
| **Session Recording** | Yes (`record_session`) | Yes (protocol directive) | Yes (`code-cache history add`) |
| **ADR Recording** | Yes (`record_decision`) | Yes (protocol directive) | Yes (`code-cache decisions add`)|
| **Real-time File Diff** | Yes (`get_changed_files`)| Yes (`code-cache diff`) | Yes (`code-cache diff`) |

