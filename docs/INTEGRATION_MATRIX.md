# RepoMind — Universal Agent Integration Matrix

**Organization:** LostGit Solutions  
**Version:** 1.0.0-draft  

---

## 1. Agent Support Matrix

| Agent / Environment | Transport | Discovery Location | Rules Location | Skills Location | Installation Support |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Antigravity** | `stdio` MCP | `.gemini/antigravity/mcp/repomind.json` or project MCP | `AGENTS.md` | `.agents/skills/repomind-memory/` | Full Automated (`repomind agent install antigravity`) |
| **Cursor** | `stdio` MCP | `.cursor/mcp.json` | `.cursor/rules/repomind.mdc` or `.cursorrules` | `.cursor/skills/repomind-memory/` | Full Automated (`repomind agent install cursor`) |
| **Claude Code** | `stdio` MCP | `claude mcp add` / `.claude/config.json` | `CLAUDE.md` | `.claude/skills/repomind-memory/` | Full Automated (`repomind agent install claude-code`) |
| **OpenAI Codex / Copilot** | CLI stdio | Direct CLI invocation | `AGENTS.md` | N/A (CLI commands) | Instruction Scaffolding (`repomind agent install codex`) |
| **VS Code (Generic)** | `stdio` MCP | `.vscode/mcp.json` (where supported) | `.github/copilot-instructions.md` | N/A | Full Automated (`repomind agent install vscode`) |

---

## 2. Capabilities by Integration Type

| Capability | Stdio MCP | Agent Skill | Direct CLI Fallback |
| :--- | :---: | :---: | :---: |
| **Context on Demand** | Yes (`get_task_context`) | Yes (`repomind context`) | Yes (`repomind context`) |
| **Structural File Analysis**| Yes (`get_file_analysis`) | Yes (`repomind explain`) | Yes (`repomind explain`) |
| **Dependency Traversal** | Yes (`get_dependencies`) | Yes (`repomind diff`) | Yes (`repomind diff`) |
| **Session Recording** | Yes (`record_session`) | Yes (protocol directive) | Yes (`repomind history add`) |
| **ADR Recording** | Yes (`record_decision`) | Yes (protocol directive) | Yes (`repomind decisions add`)|
| **Real-time File Diff** | Yes (`get_changed_files`)| Yes (`repomind diff`) | Yes (`repomind diff`) |

