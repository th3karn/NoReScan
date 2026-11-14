# RepoMind

> **Remember Your Code. Not Your Agent's Repeated Work.**

[![CI](https://github.com/LostGit/repomind/actions/workflows/ci.yml/badge.svg)](https://github.com/LostGit/repomind/actions)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

**RepoMind** is a universal, persistent, local-first codebase-memory infrastructure for AI coding agents. It maintains a verified index of your codebase (fingerprints, AST structures, module dependencies, and technical decisions) so agents never have to re-discover or re-read unchanged files repeatedly.

---

## The Problem RepoMind Solves

When AI coding assistants (Google Antigravity, Cursor, Claude Code, OpenAI Codex, GitHub Copilot) start a task, they routinely:
- **Re-read dozens of unchanged files** to reconstruct context.
- **Re-discover project architecture**, routes, and schemas from scratch.
- **Waste tokens and latency** on redundant codebase exploration.
- **Lose architectural decisions** across conversation sessions.

**RepoMind** acts as an intelligent memory layer between your repository and AI agents:
1. **Cryptographic Fingerprints (SHA-256):** Unchanged files reuse verified structural analyses with zero re-reads.
2. **Conservative Invalidation:** When a file changes, RepoMind evaluates whether its public exported interface changed. If only internal implementation changed, dependent caches remain valid.
3. **Task-Based Context Engine:** Retrieves only relevant files, dependencies, and decisions within a token budget.
4. **Universal Agent Bridge:** Official Model Context Protocol (MCP) server + portable Agent Skill + adapters for Antigravity, Cursor, Claude Code, and Codex.
5. **100% Local-First:** Powered by native SQLite in WAL mode. Zero mandatory external APIs or cloud accounts.

---

## Architecture Overview

```
                      +-----------------------------+
                      |     DEVELOPER CODEBASE      |
                      +--------------+--------------+
                                     |
                      +--------------+--------------+
                      |                             |
                      v                             v
             [ RepoMind CLI ]              [ RepoMind MCP Server ]
             (repomind binary)             (stdio transport)
                      |                             |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |        RepoMind Core        |
                      +-----------------------------+
                      | * Scanner & Ignore Engine   |
                      | * SHA-256 Hasher & Diff     |
                      | * Multi-Language AST Parser |
                      | * Dependency Blast Radius   |
                      | * Task Context & Budgeter   |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |     Local SQLite Store      |
                      |   (.repomind/memory.db)     |
                      +-----------------------------+
```

---

## Quick Start

### 1. Installation

```bash
npm install -g repomind
```

### 2. Initialize and Index Your Repository

```bash
cd my-project

# Initialize RepoMind workspace
repomind init

# Perform initial scan and indexing
repomind scan

# View memory health and status
repomind status
```

### 3. Retrieve Context for a Task

Before asking an AI agent to implement a feature:

```bash
repomind context "Update user authentication and JWT session validation" --budget 8000
```

### 4. Connect Your Coding Agent

RepoMind comes with adapters for major AI coding assistants:

```bash
# List supported agent integrations
repomind agent list

# Install adapter for Google Antigravity
repomind agent install antigravity

# Install adapter for Cursor
repomind agent install cursor

# Install adapter for Claude Code
repomind agent install claude-code
```

---

## CLI Command Reference

| Command | Description |
| :--- | :--- |
| `repomind init [name]` | Initialize RepoMind in the repository |
| `repomind scan [--force]` | Incrementally scan and index modified/added files |
| `repomind status` | Display persistent memory statistics and cache health |
| `repomind context <query>` | Retrieve task-specific context manifest within token budget |
| `repomind explain <path>` | Explain stored AST analysis, exports, and dependencies for a file |
| `repomind decisions [list\|add]` | View or record Architectural Decision Records (ADRs) |
| `repomind doctor` | Verify SQLite database integrity and filesystem permissions |
| `repomind clean [--stale\|--all]`| Purge stale analyses or reset memory database |
| `repomind agent <list\|install>` | Manage integrations for Antigravity, Cursor, Claude Code, Codex |

Global flags supported by all commands:
- `--json`: Pure parseable JSON output to stdout.
- `--quiet`: Suppress non-essential output.
- `--project <path>`: Specify project root.

---

## MCP Server Specification

RepoMind implements the official **Model Context Protocol (MCP)** specification over stdio.

### Exposed Tools
- `get_project_overview`: Architecture, languages, and directory breakdown.
- `get_project_status`: Cache freshness, pending invalidations, and scan timestamps.
- `get_file_analysis`: Structural AST summary, exports, imports, and routes for a file.
- `get_file_fingerprint`: Verify file snapshot against live disk content.
- `get_task_context`: Context manifest ranked for a natural-language task.
- `get_dependencies`: Upstream dependencies and downstream blast radius.
- `get_decisions`: Retrieve historical architectural decisions (ADRs).
- `record_decision`: Save a new architectural decision to persistent memory.
- `record_session`: Record agent turn summaries and modified files.
- `mark_analysis_stale`: Invalidate cached analysis for a file.

### Exposed Resources
- `repomind://project/overview`
- `repomind://project/status`
- `repomind://project/decisions`

---

## Universal Agent Support

| Agent | Integration Mechanism | Configuration Files |
| :--- | :--- | :--- |
| **Google Antigravity** | `stdio` MCP + Agent Skill | `.gemini/antigravity/mcp/repomind.json`, `AGENTS.md` |
| **Cursor** | `stdio` MCP + Project Rules | `.cursor/mcp.json`, `.cursor/rules/repomind.mdc` |
| **Claude Code** | `stdio` MCP | `.claude/config.json`, `CLAUDE.md` |
| **OpenAI Codex** | Direct CLI workflow | `AGENTS.md` |
| **VS Code / Copilot** | `stdio` MCP | `.vscode/mcp.json`, `.github/copilot-instructions.md` |

---

## Monorepo Packages

RepoMind is developed as a modular TypeScript monorepo using pnpm workspaces:

- [`@repomind/shared`](file:///packages/shared): Domain models, typed error hierarchy, path security, and config schemas.
- [`@repomind/fingerprint`](file:///packages/fingerprint): Deterministic SHA-256 content hasher and diff engine.
- [`@repomind/scanner`](file:///packages/scanner): Recursive directory scanner with `.gitignore` and secret exclusions.
- [`@repomind/database`](file:///packages/database): Native SQLite persistence (`node:sqlite`) in WAL mode with migrations.
- [`@repomind/analyzer`](file:///packages/analyzer): AST and lexical code parsers (TS/JS, Python, SQL, Go, Rust).
- [`@repomind/dependency-graph`](file:///packages/dependency-graph): Directed graph, blast-radius calculation, and conservative invalidation.
- [`@repomind/context-engine`](file:///packages/context-engine): Task query ranking and token budgeting engine.
- [`@repomind/core`](file:///packages/core): Central coordinator orchestrating all subsystems.
- [`repomind`](file:///packages/cli): Commander.js developer CLI binary.
- [`@repomind/mcp`](file:///packages/mcp): Model Context Protocol server for AI coding agents.
- [`@repomind/agent-adapters`](file:///packages/agent-adapters): Configuration installers for Antigravity, Cursor, Claude Code, Codex.

---

## Security & Privacy Guarantees

1. **Local-First & Offline:** 100% of memory resides in `.repomind/memory.db`. Zero network calls are required.
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
