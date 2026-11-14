# BugBrain — Universal Agent Integration Specification

**Organization:** LostGit Solutions  
**Supported Agents:** Google Antigravity, Cursor, Claude Code, OpenAI Codex, VS Code / Copilot  

---

## 1. Universal Agent Architecture

Rather than creating separate memory silos for each coding agent, BugBrain uses an adapter-based bridge that mounts the single local SQLite memory store into each agent's native configuration ecosystem.

```
                    +------------------------------------+
                    |       BugBrain Core & SQLite       |
                    +-----------------+------------------+
                                      |
                     +----------------+----------------+
                     |                |                |
                     v                v                v
             [ Antigravity ]      [ Cursor ]     [ Claude Code ]
             * MCP stdio          * MCP stdio    * MCP stdio
             * Agent Skill        * Project Skill* .claude/skills
             * AGENTS.md rules    * .cursorrules * Session hooks
```

---

## 2. Google Antigravity Integration

Antigravity supports:
1. **Model Context Protocol (MCP):** Connects to `BugBrain mcp` via stdio.
2. **Agent Skills:** Portable skill located at `.agents/skills/BugBrain-memory/SKILL.md` or global skills directory.
3. **Project Rules:** Configured in `AGENTS.md` to instruct the agent to query BugBrain before starting complex tasks and to record decisions on completion.

### Configuration Template (`antigravity` adapter)
- `BugBrain agent install antigravity` writes:
  - Updates `.agents/skills/BugBrain-memory/SKILL.md`
  - Registers the BugBrain MCP server in `.gemini/antigravity/mcp/BugBrain.json` or project-level MCP settings:
    ```json
    {
      "mcpServers": {
        "BugBrain": {
          "command": "BugBrain",
          "args": ["mcp"],
          "env": {}
        }
      }
    }
    ```
  - Appends to `AGENTS.md`:
    ```markdown
    ## BugBrain Persistent Memory Protocol
    Before substantial coding tasks, use BugBrain MCP tools (`get_task_context`) or run `BugBrain context "<task>"` to retrieve verified file analyses and dependencies without repeating full scans. Always inspect live source files before editing. After completing work, record architectural decisions using `record_decision`.
    ```

---

## 3. Cursor Integration

Cursor supports:
- Project-level MCP servers in `.cursor/mcp.json`.
- Project rules in `.cursor/rules/BugBrain.mdc` or `.cursorrules`.
- Project skills in `.cursor/skills/BugBrain-memory/`.

### Configuration Template (`cursor` adapter)
- `BugBrain agent install cursor` writes:
  - `.cursor/mcp.json`:
    ```json
    {
      "mcpServers": {
        "BugBrain": {
          "command": "BugBrain",
          "args": ["mcp"]
        }
      }
    }
    ```
  - `.cursor/rules/BugBrain.mdc` with instructions to check BugBrain status before editing.

---

## 4. Claude Code Integration

Claude Code supports:
- MCP server registration via `claude mcp add BugBrain -- BugBrain mcp` or in `.claude/config.json`.
- Skills in `.claude/skills/BugBrain-memory/SKILL.md`.

---

## 5. OpenAI Codex & VS Code / GitHub Copilot

For environments without direct native MCP or custom skill folders:
- Installs `AGENTS.md` in repository root.
- Instructs the agent to invoke the CLI directly:
  ```bash
  BugBrain context "<task>" --format markdown
  ```
- Ensures fallback compatibility across all command-line and chat-based agents.

