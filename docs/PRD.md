# RepoMind — Product Requirements Document (PRD)

**Product:** RepoMind  
**Tagline:** Remember Your Code. Not Your Agent's Repeated Work.  
**Organization:** LostGit Solutions  
**Version:** 1.0.0-draft  
**Status:** Approved for Implementation Planning  
**Target Milestone:** v0.1.0 MVP → v1.0.0 Production  

---

## 1. Executive Summary & Vision

AI coding assistants (Google Antigravity, Cursor, Claude Code, OpenAI Codex, GitHub Copilot) are fundamentally transforming software engineering. However, these agents suffer from persistent amnesia across turns and sessions:
- They repeatedly read and analyze unchanged files.
- They repeatedly rebuild their mental model of project architecture, routes, database schemas, and dependencies.
- They consume excessive tokens and latency performing redundant investigations.
- They ask questions answered in previous sessions and can overwrite or ignore earlier architectural decisions.

**RepoMind** is a universal, persistent codebase-memory infrastructure that sits between a developer's repository and AI coding agents. It provides a local-first, verified, Git-aware memory layer that tracks:
1. Exact cryptographic fingerprints (SHA-256) of all analyzed files.
2. Structured AST-extracted summaries, imports, exports, routes, and schemas.
3. A module dependency graph for blast-radius calculation and conservative invalidation.
4. Historical agent sessions, task tracking, and documented architectural decisions.
5. Task-specific, token-budgeted context delivery via CLI, Model Context Protocol (MCP), and portable Agent Skills.

---

## 2. Product Principles

1. **Verified Knowledge, Never Stale Assumptions:** A cached summary is a verified index of a specific cryptographic snapshot. If the file changes, the cache is invalidated. Hashes prove file integrity, but agents always retain the freedom and directive to inspect live code before editing.
2. **Local-First & Privacy Preserving:** By default, 100% of the memory database (SQLite) resides on the developer's machine. Zero lines of source code or proprietary summaries are transmitted to external clouds without explicit, encrypted opt-in.
3. **Deterministic First, Semantic Optional:** Graph traversal, file fingerprints, import trees, and keyword matching form the rock-solid deterministic baseline. Vector search is never a fragile prerequisite.
4. **Universal Agent Neutrality:** RepoMind does not favor a single vendor. It integrates via official standards: MCP (Model Context Protocol) and the Open Agent Skills specification, with specialized adapters for Google Antigravity, Cursor, Claude Code, Codex, and VS Code.
5. **Conservative Invalidation:** If `auth.service.ts` changes its exported interface, dependants are flagged as potentially affected. If an internal implementation changes, unaffected structural caches remain intact. When in doubt, RepoMind marks items for verification.

---

## 3. User Personas & Use Cases

### Personas
- **Solo Full-Stack Developers:** Working on 50k+ LOC projects with AI agents, seeking to eliminate 30–60 second investigation delays on every task.
- **Freelancers & Agency Engineers:** Switching rapidly across heterogeneous client codebases and needing instant agent ramp-up.
- **Engineering Teams:** Collaborating on shared monorepos with multiple agents working concurrently without duplicate codebase scans.

### Primary User Flows
1. **Repository Onboarding:** Developer runs `repomind init` followed by `repomind scan`. RepoMind scans the repository, builds the AST metadata, indexes symbols and dependencies, and writes the SQLite database in `.repomind/memory.db`.
2. **Pre-Task Context Retrieval:** Before asking an agent to "Refactor payment checkout webhook", the developer or agent runs `repomind context "Refactor payment checkout webhook" --budget 12000`. RepoMind returns the relevant files, dependency graph, and previous architectural decisions.
3. **Agent MCP Interaction:** Google Antigravity or Cursor connects to `repomind mcp` via stdio. The agent queries `get_task_context` and `get_file_analysis`, skipping untouched modules while retrieving verified context.
4. **Incremental Change Detection:** When 3 files are edited, `repomind diff` or `repomind scan` detects precisely those 3 files, re-indexes only their ASTs, updates the dependency graph, and flags only affected downstream modules.
5. **Session & Decision Recording:** The agent records its architectural decisions via `record_decision` or `repomind decisions add`, preserving technical choices for all subsequent agent sessions.

---

## 4. Functional Requirements Matrix

| ID | Requirement | Description | Target Phase | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01** | Project Initialization | Detect repo root, write `.repomind/config.json`, init SQLite DB | Phase 0/1 | P0 |
| **FR-02** | File Discovery & Filtering | Recursive discovery respecting `.gitignore`, `.repomindignore`, binary exclusions | Phase 1 | P0 |
| **FR-03** | Cryptographic Fingerprinting | SHA-256 content hashing, size, mtime, language classification | Phase 1 | P0 |
| **FR-04** | Incremental Change Detection | Detect new, modified, deleted, renamed, unchanged files | Phase 1 | P0 |
| **FR-05** | Structural AST Analysis | Extract imports, exports, functions, classes, routes, models | Phase 2 | P0 |
| **FR-06** | Dependency Graph Engine | Map file-to-file and symbol relationships; calculate blast radius | Phase 2 | P0 |
| **FR-07** | Five-Layer Memory Store | File, Architecture, Session, Decision, Dependency tables in SQLite | Phase 2 | P0 |
| **FR-08** | Task Context Engine | Natural-language query matching, keyword + path + graph scoring, token budgeting | Phase 3 | P0 |
| **FR-09** | Command-Line Interface | `repomind` CLI with all primary commands, `--json` / `--markdown` output | Phase 4 | P0 |
| **FR-10** | Universal MCP Server | stdio MCP server implementing tools (`get_task_context`, etc.) & resources | Phase 5 | P0 |
| **FR-11** | Portable Agent Skill | `repomind-memory` Agent Skill adhering to the Agent Skills standard | Phase 6 | P0 |
| **FR-12** | Universal Agent Adapters | Custom adapters for Google Antigravity, Cursor, Claude Code, Codex, VS Code | Phase 6 | P0 |
| **FR-13** | Session & Decision Memory | Record session changes, verify against Git/hashes, store rationale | Phase 7 | P1 |
| **FR-14** | Live File Watcher | Background file watching via Chokidar for instant incremental updates | Phase 7 | P1 |
| **FR-15** | Hybrid Cloud Sync | Optional Fastify + PostgreSQL client-side encrypted sync (opt-in) | Phase 8 | P2 |

---

## 5. Non-Functional Requirements

- **Performance:**
  - Fingerprint verification: p95 < 5ms per file.
  - Full incremental scan of 1,000 files with 3 changes: < 500ms.
  - Task context retrieval: < 300ms.
  - Memory consumption: < 150MB RSS during indexing of 10,000 files.
- **Security & Safety:**
  - Strict sandboxing: Operations confined to repository root.
  - Symlink escape prevention: Symlinks pointing outside the project root are ignored.
  - Zero secret leakage: Exclude `.env*`, `*.pem`, `*.key`, `credentials*` by default.
  - Injection protection: Parameterized SQL queries on all database operations.
  - Read-before-write mandate: Skills enforce that agents inspect current source before modifying code.
- **Portability:**
  - Native cross-platform support: Windows (PowerShell/CMD), macOS (Zsh/Bash), Linux.
  - Path normalization: Internal paths standardized with forward slashes (`/`).

---

## 6. Success Metrics & KPIs

1. **Analysis Elimination Rate:** > 90% reduction in file-read operations on unchanged files during subsequent agent tasks.
2. **Context Precision:** Retrieval of all directly relevant files and 1st-degree dependencies within configured token budgets.
3. **Zero False Positives on Stale Code:** 100% of modified files detected immediately upon hash change or Git status change.
4. **Agent Integration Breadth:** Full functional verification across Antigravity, Cursor, Claude Code, and standalone MCP clients.

