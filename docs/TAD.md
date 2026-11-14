# BugBrain — Technical Architecture Document (TAD)

**System:** BugBrain Infrastructure  
**Author:** LostGit Solutions Architecture Team  
**Version:** 1.0.0-draft  
**Target Runtime:** Node.js 22+ (LTS / Current)  

---

## 1. System Overview & Architecture Diagram

BugBrain sits as an intelligent caching and context layer between the developer's physical codebase and AI coding agents.

```
                    +------------------------------------------+
                    |             DEVELOPER WORKSPACE          |
                    | (Project Files, Git Repo, .BugBrain/)    |
                    +--------------------+---------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
             [ BugBrain CLI ]                      [ BugBrain MCP Server ]
             (Commander.js)                        (Official MCP SDK stdio)
                       |                                   |
                       +-----------------+-----------------+
                                         |
                                         v
                      +--------------------------------------+
                      |            BugBrain Core             |
                      +--------------------------------------+
                      | * Project Registry & Config          |
                      | * File Scanner (Ignorer, Filter)     |
                      | * Fingerprinter (SHA-256)            |
                      | * Code Analyzer (Tree-sitter/AST)    |
                      | * Dependency Graph (Blast Radius)    |
                      | * Five-Layer Memory Coordinator      |
                      | * Context Retrieval & Token Budgeter |
                      +------------------+-------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
            [ Local SQLite Store ]               [ Agent Bridge & Skills ]
            (better-sqlite3 / WAL)               (Antigravity, Cursor, Claude)
            * files, analyses, deps              * SKILL.md & workflows
            * sessions, decisions                * adapters & config injectors
                       |
                       v (Opt-in Encrypted)
            [ BugBrain Cloud Sync ]
            (PostgreSQL / Fastify API)
```

---

## 2. Monorepo Package Topology

BugBrain is architected as an industrial-grade TypeScript monorepo using `pnpm` workspaces and `turbo`.

```
BugBrain/
├── packages/
│   ├── core/               # Central coordinator, project registry, pipeline orchestrator
│   ├── database/           # SQLite migrations, connection manager, DAO repositories
│   ├── scanner/            # File discovery, ignore rule engine, binary filter, symlink safety
│   ├── fingerprint/        # SHA-256 content hashing, fingerprint calculation, diff detection
│   ├── analyzer/           # AST and pattern analysis (JS/TS, Python, Go, Rust, Java, schemas)
│   ├── dependency-graph/   # Graph data structure, topological sorting, blast-radius calculation
│   ├── memory/             # 5-layer memory coordinator (File, Architecture, Session, Decision, Dep)
│   ├── context-engine/     # Task-based ranking, keyword/path/graph scoring, token budgeting
│   ├── cli/                # Commander.js CLI binary executable (`BugBrain`)
│   ├── mcp-server/         # Standard MCP server implementation (stdio & HTTP)
│   └── agent-adapters/     # Configuration generators & adapters for Antigravity, Cursor, Claude
│
├── skills/
│   └── BugBrain-memory/    # Standard portable Agent Skill (SKILL.md, references, scripts)
│
├── docs/                   # PRD, TAD, ARCHITECTURE, DATABASE, SECURITY, etc.
├── tests/                  # Integration and E2E test suites
└── package.json            # Monorepo root
```

---

## 3. Technology Stack & Decision Rationale

| Layer | Selected Technology | Alternative Evaluated | Decision Rationale |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript (Strict) | Plain JavaScript | Absolute type safety across packages and AST nodes |
| **Runtime** | Node.js 22+ | Deno / Bun | Broadest ecosystem support, native crypto, stable native bindings |
| **Monorepo Manager** | pnpm + Turborepo | Lerna / Nx | Lightning fast installs, strict dependency isolation, caching |
| **Local Database** | SQLite (`better-sqlite3`) | Lowdb / JSON / DuckDB | Synchronous high-speed ACID transactions, WAL mode, zero background daemon |
| **File Hashing** | Node.js `node:crypto` (SHA-256) | xxHash / MD5 | Cryptographic collision resistance, standard cross-platform consistency |
| **File Traversal** | Fast-glob + ignore | Custom readdir | Respects standard `.gitignore` syntax; handles nested ignores |
| **CLI Framework** | Commander.js | Yargs | Lightweight, standard exit code handling, seamless subcommand composition |
| **Schema Validation**| Zod | Joi / TypeBox | TypeScript-first schema inference, robust runtime boundary validation |
| **MCP Protocol** | `@modelcontextprotocol/sdk` | Custom JSON-RPC | Official standard protocol ensuring full Antigravity and Cursor compatibility |
| **Testing** | Vitest | Jest | Fast ESM support, integrated TypeScript runner, native multi-package testing |

---

## 4. Key Subsystem Workflows

### 4.1 Incremental File Analysis & Invalidation
```
[ File System Path ]
        │
        ▼
[ Read File Buffer ] ──► [ Compute SHA-256 ]
                                 │
                                 ▼
                     [ Lookup DB File Fingerprint ]
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
            [ Hashes Match ]            [ Hashes Differ or New ]
                 │                               │
                 ▼                               ▼
       [ Check Analyzer Ver. ]         [ Run AST Parser Engine ]
                 │                               │
         ┌───────┴───────┐                       ▼
       Match         Mismatch        [ Extract Imports, Exports, AST ]
         │               │                       │
         ▼               └───────────────►       ▼
  [ REUSE CACHE ]                        [ Update DB Analysis ]
  Mark Status: Valid                             │
                                                 ▼
                                     [ Invalidate Dependents ]
                                     Query Dep Graph -> Flag Blast Radius
```

### 4.2 Task Context Retrieval Pipeline
1. **User/Agent Query:** e.g. `"Implement OAuth refresh token rotation in auth service"`
2. **Query Normalization:** Tokenize into terms, detect identifiers (e.g., `OAuth`, `refreshToken`, `auth`, `service`).
3. **Multi-Vector Scoring:**
   - **Path Relevance:** File paths containing query terms (weight: 0.35).
   - **Symbol / Export Match:** Files exporting matching functions, classes, interfaces (weight: 0.30).
   - **Dependency Graph Proximity:** 1st and 2nd degree neighbours of top-scoring files (weight: 0.20).
   - **Decision & Architecture Link:** Architectural decisions matching topics (weight: 0.15).
4. **Token Budgeting:** Rank files descending by composite score. Greedily pack file summaries, signatures, and essential context until the budget (e.g. 8,000 tokens ~ 32KB) is met.
5. **Output Formatting:** Serialize as clean Markdown with file links (`file://...`) or structured JSON.

---

## 5. Security & Isolation Boundaries

- **Root Containment:** All file system calls are resolved against `project.root_path`. Any path escaping via `../` or external symlinks throws `SecurityViolationError`.
- **Secret Sanitization:** Sensitive files (`.env`, `.npmrc`, `id_rsa`, `*.pem`) are hard-blocked by the scanner before hashing or reading.
- **SQL Sanitization:** Zero dynamic SQL string concatenation. All database operations use prepared statements with positional parameters.
- **MCP Sandboxing:** MCP tools only expose operations within the registered project scope; arbitrary command execution is strictly rejected.

