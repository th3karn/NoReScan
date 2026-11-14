# norescan — Universal Agent Integration Matrix

**Organization:** LostGit Solutions  
**Version:** 1.0.0-draft  

---

## 1. Agent Support Matrix

| Agent / Environment | Transport | Discovery Location | Rules Location | Skills Location | Installation Support |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Antigravity** | `stdio` MCP | `.gemini/antigravity/mcp/norescan.json` or project MCP | `AGENTS.md` | `.agents/skills/norescan-memory/` | Full Automated (`norescan agent install antigravity`) |
| **Cursor** | `stdio` MCP | `.cursor/mcp.json` | `.cursor/rules/norescan.mdc` or `.cursorrules` | `.cursor/skills/norescan-memory/` | Full Automated (`norescan agent install cursor`) |
| **Claude Code** | `stdio` MCP | `claude mcp add` / `.claude/config.json` | `CLAUDE.md` | `.claude/skills/norescan-memory/` | Full Automated (`norescan agent install claude-code`) |
| **OpenAI Codex / Copilot** | CLI stdio | Direct CLI invocation | `AGENTS.md` | N/A (CLI commands) | Instruction Scaffolding (`norescan agent install codex`) |
| **VS Code (Generic)** | `stdio` MCP | `.vscode/mcp.json` (where supported) | `.github/copilot-instructions.md` | N/A | Full Automated (`norescan agent install vscode`) |

---

## 2. Capabilities by Integration Type

| Capability | Stdio MCP | Agent Skill | Direct CLI Fallback |
| :--- | :---: | :---: | :---: |
| **Context on Demand** | Yes (`get_task_context`) | Yes (`norescan context`) | Yes (`norescan context`) |
| **Structural File Analysis**| Yes (`get_file_analysis`) | Yes (`norescan explain`) | Yes (`norescan explain`) |
| **Dependency Traversal** | Yes (`get_dependencies`) | Yes (`norescan diff`) | Yes (`norescan diff`) |
| **Session Recording** | Yes (`record_session`) | Yes (protocol directive) | Yes (`norescan history add`) |
| **ADR Recording** | Yes (`record_decision`) | Yes (protocol directive) | Yes (`norescan decisions add`)|
| **Real-time File Diff** | Yes (`get_changed_files`)| Yes (`norescan diff`) | Yes (`norescan diff`) |

