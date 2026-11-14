# BugBrain — Universal Agent Integration Matrix

**Organization:** LostGit Solutions  
**Version:** 1.0.0-draft  

---

## 1. Agent Support Matrix

| Agent / Environment | Transport | Discovery Location | Rules Location | Skills Location | Installation Support |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Antigravity** | `stdio` MCP | `.gemini/antigravity/mcp/BugBrain.json` or project MCP | `AGENTS.md` | `.agents/skills/BugBrain-memory/` | Full Automated (`BugBrain agent install antigravity`) |
| **Cursor** | `stdio` MCP | `.cursor/mcp.json` | `.cursor/rules/BugBrain.mdc` or `.cursorrules` | `.cursor/skills/BugBrain-memory/` | Full Automated (`BugBrain agent install cursor`) |
| **Claude Code** | `stdio` MCP | `claude mcp add` / `.claude/config.json` | `CLAUDE.md` | `.claude/skills/BugBrain-memory/` | Full Automated (`BugBrain agent install claude-code`) |
| **OpenAI Codex / Copilot** | CLI stdio | Direct CLI invocation | `AGENTS.md` | N/A (CLI commands) | Instruction Scaffolding (`BugBrain agent install codex`) |
| **VS Code (Generic)** | `stdio` MCP | `.vscode/mcp.json` (where supported) | `.github/copilot-instructions.md` | N/A | Full Automated (`BugBrain agent install vscode`) |

---

## 2. Capabilities by Integration Type

| Capability | Stdio MCP | Agent Skill | Direct CLI Fallback |
| :--- | :---: | :---: | :---: |
| **Context on Demand** | Yes (`get_task_context`) | Yes (`BugBrain context`) | Yes (`BugBrain context`) |
| **Structural File Analysis**| Yes (`get_file_analysis`) | Yes (`BugBrain explain`) | Yes (`BugBrain explain`) |
| **Dependency Traversal** | Yes (`get_dependencies`) | Yes (`BugBrain diff`) | Yes (`BugBrain diff`) |
| **Session Recording** | Yes (`record_session`) | Yes (protocol directive) | Yes (`BugBrain history add`) |
| **ADR Recording** | Yes (`record_decision`) | Yes (protocol directive) | Yes (`BugBrain decisions add`)|
| **Real-time File Diff** | Yes (`get_changed_files`)| Yes (`BugBrain diff`) | Yes (`BugBrain diff`) |

