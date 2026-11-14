# RepoMind — Universal Agent Integration Specification

**Organization:** LostGit Solutions  
**Supported Agents:** Google Antigravity, Cursor, Claude Code, OpenAI Codex, VS Code / Copilot  

---

## 1. Universal Agent Architecture

Rather than creating separate memory silos for each coding agent, RepoMind uses an adapter-based bridge that mounts the single local SQLite memory store into each agent's native configuration ecosystem.

```
                    +------------------------------------+
                    |       RepoMind Core & SQLite       |
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
1. **Model Context Protocol (MCP):** Connects to `repomind mcp` via stdio.
2. **Agent Skills:** Portable skill located at `.agents/skills/repomind-memory/SKILL.md` or global skills directory.
3. **Project Rules:** Configured in `AGENTS.md` to instruct the agent to query RepoMind before starting complex tasks and to record decisions on completion.

### Configuration Template (`antigravity` adapter)
- `repomind agent install antigravity` writes:
  - Updates `.agents/skills/repomind-memory/SKILL.md`
  - Registers the RepoMind MCP server in `.gemini/antigravity/mcp/repomind.json` or project-level MCP settings:
    ```json
    {
      "mcpServers": {
        "repomind": {
          "command": "repomind",
          "args": ["mcp"],
          "env": {}
        }
      }
    }
    ```
  - Appends to `AGENTS.md`:
    ```markdown
    ## RepoMind Persistent Memory Protocol
    Before substantial coding tasks, use RepoMind MCP tools (`get_task_context`) or run `repomind context "<task>"` to retrieve verified file analyses and dependencies without repeating full scans. Always inspect live source files before editing. After completing work, record architectural decisions using `record_decision`.
    ```

---

## 3. Cursor Integration

Cursor supports:
- Project-level MCP servers in `.cursor/mcp.json`.
- Project rules in `.cursor/rules/repomind.mdc` or `.cursorrules`.
- Project skills in `.cursor/skills/repomind-memory/`.

### Configuration Template (`cursor` adapter)
- `repomind agent install cursor` writes:
  - `.cursor/mcp.json`:
    ```json
    {
      "mcpServers": {
        "repomind": {
          "command": "repomind",
          "args": ["mcp"]
        }
      }
    }
    ```
  - `.cursor/rules/repomind.mdc` with instructions to check RepoMind status before editing.

---

## 4. Claude Code Integration

Claude Code supports:
- MCP server registration via `claude mcp add repomind -- repomind mcp` or in `.claude/config.json`.
- Skills in `.claude/skills/repomind-memory/SKILL.md`.

---

## 5. OpenAI Codex & VS Code / GitHub Copilot

For environments without direct native MCP or custom skill folders:
- Installs `AGENTS.md` in repository root.
- Instructs the agent to invoke the CLI directly:
  ```bash
  repomind context "<task>" --format markdown
  ```
- Ensures fallback compatibility across all command-line and chat-based agents.

