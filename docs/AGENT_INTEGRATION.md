# BugBrain — Universal Agent Integration Guide

---

## 1. Supported Coding Agents

| Agent | Discovery Location | Rules Location | Skills Location | Automated Installer |
| :--- | :--- | :--- | :--- | :---: |
| **Google Antigravity** | `.gemini/antigravity/mcp/bugbrain.json` | `AGENTS.md` | `.agents/skills/bugbrain-memory/` | `bugbrain agent install antigravity` |
| **Cursor** | `.cursor/mcp.json` | `.cursor/rules/bugbrain.mdc` | `.cursor/skills/bugbrain-memory/` | `bugbrain agent install cursor` |
| **Claude Code** | `.claude/config.json` | `CLAUDE.md` | `.claude/skills/bugbrain-memory/` | `bugbrain agent install claude-code` |
| **OpenAI Codex** | Direct CLI invocation | `AGENTS.md` | N/A | `bugbrain agent install codex` |
| **VS Code / Copilot** | `.vscode/mcp.json` | `.github/copilot-instructions.md` | N/A | `bugbrain agent install vscode` |

---

## 2. Portable Agent Skill: `bugbrain-memory`

Installed at `skills/bugbrain-memory/SKILL.md` (and copied into agent skill locations):
- Instructs agents to query BugBrain before writing code.
- Enforces the golden rule: **Never assume a cached summary replaces live source inspection before writing modifications.**
- Instructs agents to call `record_decision` and `record_session` on completion.
