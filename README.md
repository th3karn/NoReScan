# NoReScan

> **Your AI's brain for your codebase.**  
> *Stop making your AI rediscover everything.*

[![CI](https://github.com/th3karn/NoReScan/actions/workflows/ci.yml/badge.svg)](https://github.com/th3karn/NoReScan/actions)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

**NoReScan** is a universal, persistent, local-first codebase-memory infrastructure for AI coding agents. It maintains a verified index of your codebase (SHA-256 fingerprints, AST structures, module dependencies, blast-radius graphs, and technical decisions) so agents never have to re-discover or re-read unchanged files repeatedly.

---

## The Problem norescan Solves

When AI coding assistants (Google Antigravity, Cursor, Windsurf, Claude Code, OpenAI Codex, GitHub Copilot) start a task, they routinely:
- **Re-read dozens of unchanged files** to reconstruct context.
- **Re-discover project architecture**, routes, and database schemas from scratch.
- **Waste tokens and latency** on redundant codebase exploration.
- **Lose architectural decisions** across conversation sessions.

**norescan** acts as an intelligent memory layer between your repository and AI agents:
1. **Cryptographic Fingerprints (SHA-256):** Unchanged files reuse verified structural analyses with zero re-reads.
2. **Conservative Invalidation:** When a file changes, norescan evaluates whether its public exported interface changed. If only internal implementation changed, dependent caches remain valid.
3. **Task-Based Context Engine:** Retrieves only relevant files, dependencies, and decisions within a token budget.
4. **Universal Agent Bridge:** Official Model Context Protocol (MCP) server + portable Agent Skill + adapters for Antigravity, Cursor, Claude Code, and Codex.
5. **100% Local-First:** Powered by native SQLite in WAL mode (`.norescan/norescan.db`). Zero mandatory external APIs or cloud accounts.
6. **Safe Legacy Migration:** Automatic, non-destructive migration from legacy `.repomind/` to `.norescan/` with automatic backups.

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
              [ norescan CLI ]              [ norescan MCP Server ]
             (norescan binary)              (stdio transport)
                      |                             |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |        norescan Core        |
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
                      |   (.norescan/norescan.db)   |
                      +-----------------------------+
```

---

## Quick Start

### 1. Installation

```bash
npm install -g @norescan/cli
# or run directly with npx
npx @norescan/cli <command>
```

### 2. Initialize and Index Your Repository

```bash
cd my-project

# Initialize norescan workspace
norescan init

# Perform initial scan and indexing
norescan scan

# View memory health and status
norescan status
```

### 3. Retrieve Context for a Task

Before asking an AI agent to implement a feature:

```bash
norescan context "Update user authentication and JWT session validation" --budget 8000
```

### 4. Connect Your Coding Agent

norescan comes with adapters for major AI coding assistants:

```bash
# List supported agent integrations
norescan agent list

# Install adapter for Google Antigravity
norescan agent install antigravity

# Install adapter for Cursor / Windsurf
norescan agent install cursor

# Install adapter for Claude Code
norescan agent install claude-code

# Install adapter for VS Code / GitHub Copilot
norescan agent install vscode
```

---

## CLI Command Reference (22 Commands)

| Command | Description |
| :--- | :--- |
| `norescan init [name]` | Initialize norescan in the repository |
| `norescan scan [--force]` | Incrementally scan and index modified/added files |
| `norescan remember <file>` | Real-time memory indexing of newly created or edited files (<5ms) |
| `norescan refresh [path]` | Re-analyze a specific file or all modified files |
| `norescan status` | Display persistent memory statistics and cache health |
| `norescan context <query>` | Retrieve task-specific context manifest within token budget |
| `norescan fix [command]` | Diagnose test or compiler errors and auto-heal bugs using dependency graph |
| `norescan test [--fix]` | Run project test suites and optionally auto-heal broken tests |
| `norescan analyze <path>` | Run structural AST analysis on a file and display metadata |
| `norescan explain <path>` | Explain stored AST analysis, exports, and dependencies for a file |
| `norescan diff` | Show added, modified, deleted, and unchanged files vs stored memory |
| `norescan deps <path>` | Inspect file dependencies, blast radius, and circular dependencies |
| `norescan search <query>` | Search project memory across file paths, symbols, routes, and ADRs |
| `norescan decisions [list\|add]` | View or record Architectural Decision Records (ADRs) |
| `norescan history` | View agent session activity history and tasks |
| `norescan watch` | Watch workspace for file changes and auto-index in real-time |
| `norescan mcp` | Run the norescan Model Context Protocol server on stdio |
| `norescan agent [list\|install\|uninstall\|validate]` | Manage integrations for Antigravity, Cursor, Claude Code, Codex |
| `norescan skill [list\|install\|validate]` | Manage norescan Agent Skills |
| `norescan doctor` | Verify SQLite database integrity and filesystem permissions |
| `norescan clean [--stale\|--all]`| Purge stale analyses or reset memory database |
| `norescan export [-o file]` | Export project memory records into portable JSON |
| `norescan import <file>` | Import project memory records from a JSON file into SQLite |
| `norescan db [status\|backup]` | Direct SQLite database inspection and atomic backup |
| `norescan config [list\|get\|set]` | Inspect or modify norescan configuration |

Global flags supported by all commands:
- `--json`: Pure parseable JSON output to stdout.
- `--quiet`: Suppress non-essential output.
- `--verbose`: Enable verbose debugging output.
- `-C, --project <path>`: Specify project root directory.

---

## MCP Server Specification

norescan implements the official **Model Context Protocol (MCP)** specification over stdio.

### Exposed Tools (27 Tools)
- `remember_file`: Fast real-time indexing of newly created or edited files in memory.
- `inspect_file_memory`: Direct AST symbol inspection from SQLite memory without disk reads.
- `diagnose_and_fix`: Analyze test output/errors and generate automated code fixes.
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
- `get_languages`: Polyglot language breakdown and statistics.
- `get_ecosystems`: Detected ecosystems (Node, Python, Rust, Go, etc.).
- `get_causal_graph`: Full causal dependency graph and hot files ranking.
- `blast_diff`: Calculate blast cone directly from a git diff patch.
- `get_sync_status`: Synchronization cursor, peer state, and queue depth.

### Exposed Resources (6 Resources)
- `norescan://project/overview`: Project metadata and statistics.
- `norescan://project/status`: Cache freshness and file status counts.
- `norescan://project/decisions`: Architectural Decision Records (ADRs).
- `norescan://project/dependencies`: Complete directed import dependency graph.
- `norescan://project/hot-files`: Most load-bearing files with highest dependents.
- `norescan://project/schema`: Database schema definition and tables.

---

## Universal Agent Support

| Agent | Integration Mechanism | Configuration Files |
| :--- | :--- | :--- |
| **Google Antigravity** | `stdio` MCP + Agent Skill | `.gemini/antigravity/mcp/norescan.json`, `AGENTS.md` |
| **Cursor / Windsurf** | `stdio` MCP + Project Rules | `.cursor/mcp.json`, `.cursor/rules/norescan.mdc` |
| **Claude Code** | `stdio` MCP | `.claude/config.json`, `CLAUDE.md` |
| **OpenAI Codex** | Direct CLI workflow | `AGENTS.md` |
| **VS Code / Copilot** | `stdio` MCP | `.vscode/mcp.json`, `.github/copilot-instructions.md` |

---

## Monorepo Packages

norescan is developed as a modular TypeScript monorepo using pnpm workspaces:

- [`@norescan/shared`](file:///packages/shared): Domain models, typed error hierarchy, path security, and config schemas.
- [`@norescan/fingerprint`](file:///packages/fingerprint): Deterministic SHA-256 content hasher and diff engine.
- [`@norescan/scanner`](file:///packages/scanner): Recursive directory scanner with `.gitignore` and secret exclusions.
- [`@norescan/database`](file:///packages/database): Native SQLite persistence (`node:sqlite`) in WAL mode with migrations.
- [`@norescan/analyzer`](file:///packages/analyzer): AST and lexical code parsers (TS/JS, Python, SQL, JSON).
- [`@norescan/dependency-graph`](file:///packages/dependency-graph): Directed graph, blast-radius calculation, and conservative invalidation.
- [`@norescan/ecosystems`](file:///packages/ecosystems): Polyglot runtime environment detection (Node, Python, Rust, Go, Java, Ruby, PHP).
- [`@norescan/context-engine`](file:///packages/context-engine): Task query ranking and token budgeting engine.
- [`@norescan/fixer`](file:///packages/fixer): Test runner diagnostics, error blast-radius tracer, and automated bug-healing engine.
- [`@norescan/core`](file:///packages/core): Central coordinator orchestrating all subsystems and legacy migration.
- [`@norescan/cli`](file:///packages/cli): Developer CLI binary (`norescan`, `no-rescan`, `code-cache`).
- [`@norescan/mcp`](file:///packages/mcp): Model Context Protocol server for AI coding agents.
- [`@norescan/agent-adapters`](file:///packages/agent-adapters): Configuration installers for Antigravity, Cursor, Claude Code, Codex.

---

## Security & Privacy Guarantees

1. **Local-First & Offline:** 100% of memory resides in `.norescan/norescan.db`. Zero network calls are required.
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
