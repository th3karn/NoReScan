# BUGBRAIN — PRODUCT DIFFERENTIATION & CORE ARCHITECTURE

> **Tagline:** Your AI's brain for your codebase.  
> **Positioning:** Stop making your AI rediscover everything.

BugBrain fundamentally transforms how AI coding agents and human developers interact with codebases. Where standard AI agents treat codebases as static text files—repetitively scanning directories, grepping across thousands of lines, and losing context across sessions—BugBrain establishes a **persistent, incremental, multi-interface codebase memory infrastructure**.

---

## The Three Architectural Pillars

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    AI Coding Agents                    │
                               │           (Cursor, Windsurf, Antigravity)              │
                               └───────────────────────────┬────────────────────────────┘
                                                           │ MCP Protocol
                                                           ▼
┌─────────────────────────┐             ┌─────────────────────────────────────┐             ┌─────────────────────────┐
│     Developer CLI       │◄─── CLI ────┤                                     ├─── REST ───►│      CI/CD Pipelines    │
│       `bugbrain`        │             │      BUGBRAIN MEMORY LAYER          │             │  (PR Blast Radius &     │
└─────────────────────────┘             │       (Local SQLite Engine)         │             │   Regression Checking)  │
                                        │                                     │             └─────────────────────────┘
┌─────────────────────────┐             │  - Incremental AST Hash Caching     │             ┌─────────────────────────┐
│  Python Data & Tooling  │◄── Python ──┤  - Causal Dependency Graph          │◄── Sync ───►│    BugBrain Cloud       │
│      (`sdk/python`)     │             │  - Polyglot Ecosystem Intelligence  │             │   (Opt-in Encrypted     │
└─────────────────────────┘             │  - Architectural Decision Log (ADR) │             │    Peer Synchronization)│
                                        └─────────────────────────────────────┘             └─────────────────────────┘
```

---

## 1. Pillar 1: Causal Graph & The Cartographer (Blast a Diff)

### The Problem with Traditional Agents
Existing tools (like ripgrep, AST grep, or naive RAG embeddings) retrieve code by text similarity. When an engineer modifies `auth.service.ts`, an agent has no intrinsic awareness of which upstream files depend on this service, what breaks transitively, or which files are architectural load-bearers.

### The BugBrain Solution: Causal Cartography
- **In-Degree Ranking ("Hot Files"):** BugBrain computes the exact directed graph of module dependencies. Files with the highest in-degree (e.g., `logging_setup.py`, `envelope.ts`, `database.ts`) are identified as load-bearing components requiring strict interface stability.
- **Blast a Diff Impact Analysis:** Given any git diff or proposed patch (`git diff` or `git diff HEAD~1`), the Cartographer maps changed files to their full upstream dependency cone.
  - **Level 1:** Direct consumers of the changed file.
  - **Level 2–N:** Transitive consumers that may experience subtle regression propagation.
- **Interactive Visual Dashboard:** A dark-mode Cartographer canvas (`bugbrain serve`) visually glows hot files in cyan and illuminates blast cones in amber/orange, providing immediate visual confirmation before merging code.

---

## 2. Pillar 2: Universal Multi-Interface Memory Hub

BugBrain does not lock developers or teams into a single proprietary interface. It exposes the central SQLite memory layer across four production-grade interfaces:

| Interface | Protocol | Target Audience | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Model Context Protocol (MCP)** | JSON-RPC Stdio | Cursor, Windsurf, Antigravity, Claude Code | 24 registered tools & 13 resources providing token-budgeted context, blast radius calculation, and AST summaries. |
| **Unified CLI** | POSIX CLI (`bugbrain`) | Terminal developers & automation scripts | Full command suite: `scan`, `diff`, `blast`, `hot-files`, `languages`, `ecosystems`, `packages`, `commands`, `env`, `run`, `serve`. |
| **Python SDK** | Zero-dependency native `sqlite3` + HTTP | Custom linters, data science, Python scripts | Query memory status, hot files, blast cone from diffs, and package manifests directly in Python pipelines. |
| **REST API Server** | HTTP / JSON | CI/CD pipelines (GitHub Actions, GitLab CI) | Programmatic endpoints (`/api/v1/blast-radius`, `/api/v1/graph`) to block pull requests with excessive blast radius. |

---

## 3. Pillar 3: Hybrid Memory & Synchronization Architecture

BugBrain is built on a **Local-First, Cloud-Optional** synchronization philosophy:

1. **Zero Cloud Dependency:** Ordinary indexing, scanning, AST parsing, and context retrieval run entirely on the developer's local machine inside a local SQLite database (`.bugbrain/bugbrain.db`).
2. **Strict Privacy Invariant:** **Source code never leaves the developer's machine.** Cloud and peer synchronization strictly syncs cryptographic content hashes, dependency edges, file paths, high-level AST summaries, and Architectural Decision Records (ADRs).
3. **Deterministic Merge Resolution:** Structured records merge deterministically using vector clocks and Lamport timestamps. Decisions (ADRs) are append-only.
4. **Offline Change Queue:** When working offline or without network access, local mutations are queued in `sync_offline_queue`. When connectivity resumes, the queue flushes smoothly with conflict detection.
