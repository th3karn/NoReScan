# norescan — System Architecture & Component Specification

**Product:** norescan  
**Organization:** LostGit Solutions  
**Repository:** [https://github.com/th3karn/norescan](https://github.com/th3karn/norescan)  

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
             [ norescan CLI ]              [ norescan MCP Server ]
             (norescan executable)         (stdio / HTTP transport)
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

## 2. Monorepo Package Topology (`pnpm` workspaces)

All packages are strictly named using lowercase `@norescan/<pkg>`:

- **`@norescan/shared`:** Domain models, typed error hierarchy, path security containment, configuration schemas.
- **`@norescan/fingerprint`:** SHA-256 content hasher, file stat extractor, rename/diff engine.
- **`@norescan/scanner`:** Recursive directory walker, ignore rules, secret and binary exclusions.
- **`@norescan/database`:** SQLite persistence (`node:sqlite`) in WAL mode, forward migrations, 6 typed DAOs.
- **`@norescan/analyzer`:** AST parsers for TypeScript, JavaScript, Python, SQL, and JSON.
- **`@norescan/dependency-graph`:** Directed graph, cycle detection, blast-radius calculation, conservative invalidator.
- **`@norescan/context-engine`:** Task query tokenizer, multi-vector relevance scoring, token budgeter.
- **`@norescan/core`:** Workflow coordinator (`init`, `scan`, `getStatus`, `doctor`, `clean`, `migrateLegacy`).
- **`norescan` (CLI):** Commander.js developer CLI binary.
- **`@norescan/mcp`:** Universal Model Context Protocol (MCP) server for AI coding agents.
- **`@norescan/agent-adapters`:** Installers for Antigravity, Cursor, Claude Code, Codex, and VS Code.
- **`skills/norescan-memory`:** Portable Agent Skill adhering to the Open Agent Skills specification.
