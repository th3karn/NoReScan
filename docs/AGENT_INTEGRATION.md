# code-cache — Universal Agent Integration Guide

---

## 1. Supported Coding Agents

| Agent | Discovery Location | Rules Location | Skills Location | Automated Installer |
| :--- | :--- | :--- | :--- | :---: |
| **Google Antigravity** | `.gemini/antigravity/mcp/code-cache.json` | `AGENTS.md` | `.agents/skills/code-cache-memory/` | `code-cache agent install antigravity` |
| **Cursor** | `.cursor/mcp.json` | `.cursor/rules/code-cache.mdc` | `.cursor/skills/code-cache-memory/` | `code-cache agent install cursor` |
| **Claude Code** | `.claude/config.json` | `CLAUDE.md` | `.claude/skills/code-cache-memory/` | `code-cache agent install claude-code` |
| **OpenAI Codex** | Direct CLI invocation | `AGENTS.md` | N/A | `code-cache agent install codex` |
| **VS Code / Copilot** | `.vscode/mcp.json` | `.github/copilot-instructions.md` | N/A | `code-cache agent install vscode` |

---

## 2. Portable Agent Skill: `code-cache-memory`

Installed at `skills/code-cache-memory/SKILL.md` (and copied into agent skill locations):
- Instructs agents to query code-cache before writing code.
- Enforces the golden rule: **Never assume a cached summary replaces live source inspection before writing modifications.**
- Instructs agents to call `record_decision` and `record_session` on completion.

