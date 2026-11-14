# code-cache

> **Your AI's brain for your codebase.**  
> *Stop making your AI rediscover everything.*

[![CI](https://github.com/th3karn/code-cache/actions/workflows/ci.yml/badge.svg)](https://github.com/th3karn/code-cache/actions)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

**code-cache** is a universal, persistent, local-first codebase-memory infrastructure for AI coding agents. It maintains a verified index of your codebase (SHA-256 fingerprints, AST structures, module dependencies, blast-radius graphs, and technical decisions) so agents never have to re-discover or re-read unchanged files repeatedly.

---

## The Problem code-cache Solves

When AI coding assistants (Google Antigravity, Cursor, Windsurf, Claude Code, OpenAI Codex, GitHub Copilot) start a task, they routinely:
- **Re-read dozens of unchanged files** to reconstruct context.
- **Re-discover project architecture**, routes, and database schemas from scratch.
- **Waste tokens and latency** on redundant codebase exploration.
- **Lose architectural decisions** across conversation sessions.

**code-cache** acts as an intelligent memory layer between your repository and AI agents:
1. **Cryptographic Fingerprints (SHA-256):** Unchanged files reuse verified structural analyses with zero re-reads.
2. **Conservative Invalidation:** When a file changes, code-cache evaluates whether its public exported interface changed. If only internal implementation changed, dependent caches remain valid.
3. **Task-Based Context Engine:** Retrieves only relevant files, dependencies, and decisions within a token budget.
4. **Universal Agent Bridge:** Official Model Context Protocol (MCP) server + portable Agent Skill + adapters for Antigravity, Cursor, Claude Code, and Codex.
5. **100% Local-First:** Powered by native SQLite in WAL mode (`.code-cache/code-cache.db`). Zero mandatory external APIs or cloud accounts.
6. **Safe Legacy Migration:** Automatic, non-destructive migration from legacy `.repomind/` to `.code-cache/` with automatic backups.

---

## System Architecture

```
                      +-----------------------------+
                      |     DEVELOPER CODEBASE      |
                      +--------------+--------------+
                                     |
                      +--------------+--------------+
                      |                             |
                      v                             v
              [ code-cache CLI ]              [ code-cache MCP Server ]
             (code-cache binary)              (stdio transport)
                      |                             |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |        code-cache Core        |
                      +-----------------------------+
                      | * Scanner & Ignore Engine   |
                      | * SHA-256 Hasher & Diff     |
                      | * Multi-Language AST Parser |
                      | * Dependency Blast Radius   |
                      | * Task Context & Budgeter   |
                      | * Legacy Migration Engine   |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |     Local SQLite Store      |
                      |   (.code-cache/code-cache.db)   |
                      +-----------------------------+
```

---

## Quick Start

### 1. Installation

```bash
npm install -g code-cache
# or with pnpm
pnpm add -g code-cache
```

### 2. Initialize and Index Your Repository

```bash
cd my-project

# Initialize code-cache workspace
code-cache init

# Perform initial scan and indexing
code-cache scan

# View memory health and status
code-cache status
```

### 3. Retrieve Context for a Task

Before asking an AI agent to implement a feature:

```bash
code-cache context "Update user authentication and JWT session validation" --budget 8000
```

### 4. Connect Your Coding Agent

code-cache comes with adapters for major AI coding assistants:

```bash
# List supported agent integrations
code-cache agent list

# Install adapter for Google Antigravity
code-cache agent install antigravity

# Install adapter for Cursor / Windsurf
code-cache agent install cursor

# Install adapter for Claude Code
code-cache agent install claude-code

# Install adapter for VS Code / GitHub Copilot
code-cache agent install vscode
```

---

## CLI Command Reference (22 Commands)

| Command | Description |
| :--- | :--- |
| `code-cache init [name]` | Initialize code-cache in the repository |
| `code-cache scan [--force]` | Incrementally scan and index modified/added files |
| `code-cache refresh [path]` | Re-analyze a specific file or all modified files |
| `code-cache status` | Display persistent memory statistics and cache health |
| `code-cache context <query>` | Retrieve task-specific context manifest within token budget |
| `code-cache analyze <path>` | Run structural AST analysis on a file and display metadata |
| `code-cache explain <path>` | Explain stored AST analysis, exports, and dependencies for a file |
| `code-cache diff` | Show added, modified, deleted, and unchanged files vs stored memory |
| `code-cache deps <path>` | Inspect file dependencies, blast radius, and circular dependencies |
| `code-cache search <query>` | Search project memory across file paths, symbols, routes, and ADRs |
| `code-cache decisions [list\|add]` | View or record Architectural Decision Records (ADRs) |
| `code-cache history` | View agent session activity history and tasks |
| `code-cache watch` | Watch workspace for file changes and auto-index in real-time |
| `code-cache mcp` | Run the code-cache Model Context Protocol server on stdio |
| `code-cache agent [list\|install\|uninstall\|validate]` | Manage integrations for Antigravity, Cursor, Claude Code, Codex |
| `code-cache skill [list\|install\|validate]` | Manage code-cache Agent Skills |
| `code-cache doctor` | Verify SQLite database integrity and filesystem permissions |
| `code-cache clean [--stale\|--all]`| Purge stale analyses or reset memory database |
| `code-cache export [-o file]` | Export project memory records into portable JSON |
| `code-cache import <file>` | Import project memory records from a JSON file into SQLite |
| `code-cache db [status\|backup]` | Direct SQLite database inspection and atomic backup |
| `code-cache config [list\|get\|set]` | Inspect or modify code-cache configuration |

Global flags supported by all commands:
- `--json`: Pure parseable JSON output to stdout.
- `--quiet`: Suppress non-essential output.
- `--verbose`: Enable verbose debugging output.
- `-C, --project <path>`: Specify project root directory.

---

## MCP Server Specification

code-cache implements the official **Model Context Protocol (MCP)** specification over stdio.

### Exposed Tools (14 Tools)
- `get_project_overview`: Architecture, languages, and directory breakdown.
- `get_project_status`: Cache freshness, pending invalidations, and scan timestamps.
- `get_file_analysis`: Structural AST summary, exports, imports, and routes for a file.
- `get_file_fingerprint`: Verify file snapshot against live disk content.
- `get_task_context`: Context manifest ranked for a natural-language task.
- `get_dependencies`: Upstream dependencies and downstream module relationships.
- `get_blast_radius`: Calculate transitive blast radius cone for changed files.
- `get_hot_files`: Identify load-bearing files with highest in-degree (most callers).
- `search_project_memory`: Natural search across files, symbols, routes, and decisions.
- `get_changed_files`: Live diff (added, modified, deleted) against database.
- `refresh_analysis`: Incremental scan or re-analyze a specific file.
- `record_decision`: Save a new architectural decision (ADR) to persistent memory.
- `get_decisions`: Retrieve historical architectural decisions (ADRs).
- `record_session`: Record agent turn summaries and modified files.

### Exposed Resources (6 Resources)
- `code-cache://project/overview`: Project metadata and statistics.
- `code-cache://project/status`: Cache freshness and file status counts.
- `code-cache://project/decisions`: Architectural Decision Records (ADRs).
- `code-cache://project/dependencies`: Complete directed import dependency graph.
- `code-cache://project/hot-files`: Most load-bearing files with highest dependents.
- `code-cache://project/schema`: Database schema definition and tables.

---

## Universal Agent Support

| Agent | Integration Mechanism | Configuration Files |
| :--- | :--- | :--- |
| **Google Antigravity** | `stdio` MCP + Agent Skill | `.gemini/antigravity/mcp/code-cache.json`, `AGENTS.md` |
| **Cursor / Windsurf** | `stdio` MCP + Project Rules | `.cursor/mcp.json`, `.cursor/rules/code-cache.mdc` |
| **Claude Code** | `stdio` MCP | `.claude/config.json`, `CLAUDE.md` |
| **OpenAI Codex** | Direct CLI workflow | `AGENTS.md` |
| **VS Code / Copilot** | `stdio` MCP | `.vscode/mcp.json`, `.github/copilot-instructions.md` |

---

## Monorepo Packages

code-cache is developed as a modular TypeScript monorepo using pnpm workspaces:

- [`@code-cache/shared`](file:///packages/shared): Domain models, typed error hierarchy, path security, and config schemas.
- [`@code-cache/fingerprint`](file:///packages/fingerprint): Deterministic SHA-256 content hasher and diff engine.
- [`@code-cache/scanner`](file:///packages/scanner): Recursive directory scanner with `.gitignore` and secret exclusions.
- [`@code-cache/database`](file:///packages/database): Native SQLite persistence (`node:sqlite`) in WAL mode with migrations.
- [`@code-cache/analyzer`](file:///packages/analyzer): AST and lexical code parsers (TS/JS, Python, SQL, JSON).
- [`@code-cache/dependency-graph`](file:///packages/dependency-graph): Directed graph, blast-radius calculation, and conservative invalidation.
- [`@code-cache/context-engine`](file:///packages/context-engine): Task query ranking and token budgeting engine.
- [`@code-cache/core`](file:///packages/core): Central coordinator orchestrating all subsystems and legacy migration.
- [`code-cache`](file:///packages/cli): Commander.js developer CLI binary.
- [`@code-cache/mcp`](file:///packages/mcp): Model Context Protocol server for AI coding agents.
- [`@code-cache/agent-adapters`](file:///packages/agent-adapters): Configuration installers for Antigravity, Cursor, Claude Code, Codex.

---

## Security & Privacy Guarantees

1. **Local-First & Offline:** 100% of memory resides in `.code-cache/code-cache.db`. Zero network calls are required.
2. **Path Traversal Protection:** All file operations are verified using boundary checks to prevent directory escaping.
3. **Hardcoded Secret Exclusions:** Credentials (`.env*`, `*.pem`, `*.key`, `id_rsa*`) are blocked at the scanner level before reading or hashing.
4. **Parameterized SQL:** 100% of database queries use prepared statements.
5. **Read-Before-Write Mandate:** Agent skills explicitly instruct agents to verify current physical source code before writing edits.

---

## Contributing

Contributions are welcome! Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`docs/ROADMAP.md`](./docs/ROADMAP.md) before opening a pull request.

---

## License

Apache-2.0 © LostGit Solutions
