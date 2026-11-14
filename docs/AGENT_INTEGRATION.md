# norescan — Universal Agent Integration Guide

---

## 1. Supported Coding Agents

| Agent | Discovery Location | Rules Location | Skills Location | Automated Installer |
| :--- | :--- | :--- | :--- | :---: |
| **Google Antigravity** | `.gemini/antigravity/mcp/norescan.json` | `AGENTS.md` | `.agents/skills/norescan-memory/` | `norescan agent install antigravity` |
| **Cursor** | `.cursor/mcp.json` | `.cursor/rules/norescan.mdc` | `.cursor/skills/norescan-memory/` | `norescan agent install cursor` |
| **Claude Code** | `.claude/config.json` | `CLAUDE.md` | `.claude/skills/norescan-memory/` | `norescan agent install claude-code` |
| **OpenAI Codex** | Direct CLI invocation | `AGENTS.md` | N/A | `norescan agent install codex` |
| **VS Code / Copilot** | `.vscode/mcp.json` | `.github/copilot-instructions.md` | N/A | `norescan agent install vscode` |

---

## 2. Portable Agent Skill: `norescan-memory`

Installed at `skills/norescan-memory/SKILL.md` (and copied into agent skill locations):
- Instructs agents to query norescan before writing code.
- Enforces the golden rule: **Never assume a cached summary replaces live source inspection before writing modifications.**
- Instructs agents to call `record_decision` and `record_session` on completion.

