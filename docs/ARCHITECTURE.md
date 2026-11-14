# BugBrain — System Architecture & Component Specification

**Product:** BugBrain  
**Organization:** LostGit Solutions  
**Repository:** [https://github.com/th3karn/BugBrain](https://github.com/th3karn/BugBrain)  

---

## 1. System Architecture

```
                      +-----------------------------+
                      |     DEVELOPER WORKSPACE     |
                      |   (Source Files, Git Repo)  |
                      +--------------+--------------+
                                     |
                      +--------------+--------------+
                      |                             |
                      v                             v
             [ BugBrain CLI ]              [ BugBrain MCP Server ]
             (bugbrain executable)         (stdio / HTTP transport)
                      |                             |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |        BugBrain Core        |
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
                      |   (.bugbrain/bugbrain.db)   |
                      +-----------------------------+
```

---

## 2. Monorepo Package Topology (`pnpm` workspaces)

All packages are strictly named using lowercase `@bugbrain/<pkg>`:

- **`@bugbrain/shared`:** Domain models, typed error hierarchy, path security containment, configuration schemas.
- **`@bugbrain/fingerprint`:** SHA-256 content hasher, file stat extractor, rename/diff engine.
- **`@bugbrain/scanner`:** Recursive directory walker, ignore rules, secret and binary exclusions.
- **`@bugbrain/database`:** SQLite persistence (`node:sqlite`) in WAL mode, forward migrations, 6 typed DAOs.
- **`@bugbrain/analyzer`:** AST parsers for TypeScript, JavaScript, Python, SQL, and JSON.
- **`@bugbrain/dependency-graph`:** Directed graph, cycle detection, blast-radius calculation, conservative invalidator.
- **`@bugbrain/context-engine`:** Task query tokenizer, multi-vector relevance scoring, token budgeter.
- **`@bugbrain/core`:** Workflow coordinator (`init`, `scan`, `getStatus`, `doctor`, `clean`, `migrateLegacy`).
- **`bugbrain` (CLI):** Commander.js developer CLI binary.
- **`@bugbrain/mcp`:** Universal Model Context Protocol (MCP) server for AI coding agents.
- **`@bugbrain/agent-adapters`:** Installers for Antigravity, Cursor, Claude Code, Codex, and VS Code.
- **`skills/bugbrain-memory`:** Portable Agent Skill adhering to the Open Agent Skills specification.
