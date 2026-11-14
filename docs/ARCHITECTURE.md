# code-cache — System Architecture & Component Specification

**Product:** code-cache  
**Organization:** LostGit Solutions  
**Repository:** [https://github.com/th3karn/code-cache](https://github.com/th3karn/code-cache)  

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
             [ code-cache CLI ]              [ code-cache MCP Server ]
             (code-cache executable)         (stdio / HTTP transport)
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

## 2. Monorepo Package Topology (`pnpm` workspaces)

All packages are strictly named using lowercase `@code-cache/<pkg>`:

- **`@code-cache/shared`:** Domain models, typed error hierarchy, path security containment, configuration schemas.
- **`@code-cache/fingerprint`:** SHA-256 content hasher, file stat extractor, rename/diff engine.
- **`@code-cache/scanner`:** Recursive directory walker, ignore rules, secret and binary exclusions.
- **`@code-cache/database`:** SQLite persistence (`node:sqlite`) in WAL mode, forward migrations, 6 typed DAOs.
- **`@code-cache/analyzer`:** AST parsers for TypeScript, JavaScript, Python, SQL, and JSON.
- **`@code-cache/dependency-graph`:** Directed graph, cycle detection, blast-radius calculation, conservative invalidator.
- **`@code-cache/context-engine`:** Task query tokenizer, multi-vector relevance scoring, token budgeter.
- **`@code-cache/core`:** Workflow coordinator (`init`, `scan`, `getStatus`, `doctor`, `clean`, `migrateLegacy`).
- **`code-cache` (CLI):** Commander.js developer CLI binary.
- **`@code-cache/mcp`:** Universal Model Context Protocol (MCP) server for AI coding agents.
- **`@code-cache/agent-adapters`:** Installers for Antigravity, Cursor, Claude Code, Codex, and VS Code.
- **`skills/code-cache-memory`:** Portable Agent Skill adhering to the Open Agent Skills specification.
