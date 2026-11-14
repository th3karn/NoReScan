# code-cache — Universal Agent Integration Specification

**Organization:** LostGit Solutions  
**Supported Agents:** Google Antigravity, Cursor, Claude Code, OpenAI Codex, VS Code / Copilot  

---

## 1. Universal Agent Architecture

Rather than creating separate memory silos for each coding agent, code-cache uses an adapter-based bridge that mounts the single local SQLite memory store into each agent's native configuration ecosystem.

```
                    +------------------------------------+
                    |       code-cache Core & SQLite       |
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
1. **Model Context Protocol (MCP):** Connects to `code-cache mcp` via stdio.
2. **Agent Skills:** Portable skill located at `.agents/skills/code-cache-memory/SKILL.md` or global skills directory.
3. **Project Rules:** Configured in `AGENTS.md` to instruct the agent to query code-cache before starting complex tasks and to record decisions on completion.

### Configuration Template (`antigravity` adapter)
- `code-cache agent install antigravity` writes:
  - Updates `.agents/skills/code-cache-memory/SKILL.md`
  - Registers the code-cache MCP server in `.gemini/antigravity/mcp/code-cache.json` or project-level MCP settings:
    ```json
    {
      "mcpServers": {
        "code-cache": {
          "command": "code-cache",
          "args": ["mcp"],
          "env": {}
        }
      }
    }
    ```
  - Appends to `AGENTS.md`:
    ```markdown
    ## code-cache Persistent Memory Protocol
    Before substantial coding tasks, use code-cache MCP tools (`get_task_context`) or run `code-cache context "<task>"` to retrieve verified file analyses and dependencies without repeating full scans. Always inspect live source files before editing. After completing work, record architectural decisions using `record_decision`.
    ```

---

## 3. Cursor Integration

Cursor supports:
- Project-level MCP servers in `.cursor/mcp.json`.
- Project rules in `.cursor/rules/code-cache.mdc` or `.cursorrules`.
- Project skills in `.cursor/skills/code-cache-memory/`.

### Configuration Template (`cursor` adapter)
- `code-cache agent install cursor` writes:
  - `.cursor/mcp.json`:
    ```json
    {
      "mcpServers": {
        "code-cache": {
          "command": "code-cache",
          "args": ["mcp"]
        }
      }
    }
    ```
  - `.cursor/rules/code-cache.mdc` with instructions to check code-cache status before editing.

---

## 4. Claude Code Integration

Claude Code supports:
- MCP server registration via `claude mcp add code-cache -- code-cache mcp` or in `.claude/config.json`.
- Skills in `.claude/skills/code-cache-memory/SKILL.md`.

---

## 5. OpenAI Codex & VS Code / GitHub Copilot

For environments without direct native MCP or custom skill folders:
- Installs `AGENTS.md` in repository root.
- Instructs the agent to invoke the CLI directly:
  ```bash
  code-cache context "<task>" --format markdown
  ```
- Ensures fallback compatibility across all command-line and chat-based agents.

