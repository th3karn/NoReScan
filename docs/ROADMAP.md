# RepoMind — Implementation Roadmap & Acceptance Gates

**Product:** RepoMind  
**Organization:** LostGit Solutions  
**Version:** 1.0.0-draft  

---

## 1. Development Phases Overview

```
[ Phase 0: Foundation & Monorepo Setup ]
                   │
                   ▼
[ Phase 1: File Scanner & Fingerprint Engine ]
                   │
                   ▼
[ Phase 2: SQLite Memory & Code Analysis Engine ]
                   │
                   ▼
[ Phase 3: Dependency Graph & Context Retrieval Engine ]
                   │
                   ▼
[ Phase 4: Production CLI Implementation ]
                   │
                   ▼
[ Phase 5: Universal Model Context Protocol (MCP) Server ]
                   │
                   ▼
[ Phase 6: Portable Agent Skill & Universal Adapters ]
                   │
                   ▼
[ Phase 7: Session & Decision Memory Engine ]
                   │
                   ▼
[ Phase 8: Hybrid Cloud Sync (Optional / Planned) ]
                   │
                   ▼
[ Phase 9: Security Audit, Documentation & v1.0.0 Release ]
```

---

## 2. Detailed Phase Specifications & Acceptance Criteria

### Phase 0: Foundation & Monorepo Setup
- **Goal:** Establish monorepo structure, workspace configuration, TypeScript build, shared error system, and database migration engine.
- **Deliverables:**
  - `pnpm-workspace.yaml`, `turbo.json`, root `package.json`, `tsconfig.base.json`.
  - Packages: `@repomind/shared`, `@repomind/database`, `@repomind/config`.
  - SQLite database migration runner with `001_initial_schema.sql`.
- **Phase Gate (Exit Criteria):**
  - Clean build across all packages via `pnpm build`.
  - Database initialization test passes with in-memory SQLite and file SQLite.

### Phase 1: File Scanner & Fingerprint Engine
- **Goal:** Recursive file discovery, ignore matching, binary detection, SHA-256 fingerprinting, and diffing.
- **Deliverables:**
  - `@repomind/scanner`: Recursive walk with `.gitignore` and `.repomindignore` support, max file size guards, symlink checks.
  - `@repomind/fingerprint`: SHA-256 hashing, change classification (`NEW`, `MODIFIED`, `DELETED`, `UNCHANGED`).
- **Phase Gate (Exit Criteria):**
  - Scanning a 1,000-file repository completes in < 500ms.
  - Modifying 1 byte in a file correctly transitions status from `UNCHANGED` to `MODIFIED`.
  - Symlinks pointing outside root are safely ignored.

### Phase 2: SQLite Memory & Code Analysis Engine
- **Goal:** Structural AST parsing across multiple languages and 5-layer SQLite persistence.
- **Deliverables:**
  - `@repomind/analyzer`: Language-specific AST/lexical parsers (TypeScript, JavaScript, Python, Go, Rust, Java, JSON, SQL).
  - `@repomind/memory`: 5-layer memory coordinator (File, Architecture, Session, Decision, Dependency).
- **Phase Gate (Exit Criteria):**
  - Parsers extract exports, imports, functions, classes, and HTTP routes without external LLM dependencies.
  - Structural analysis is persisted to SQLite with analyzer and schema versions.

### Phase 3: Dependency Graph & Context Retrieval Engine
- **Goal:** Directed dependency graph calculation, blast-radius invalidation, and task-based context scoring.
- **Deliverables:**
  - `@repomind/dependency-graph`: Directed graph, upstream/downstream traversals, conservative invalidator.
  - `@repomind/context-engine`: Natural-language query parser, keyword + path + symbol scoring, token-budget manager.
- **Phase Gate (Exit Criteria):**
  - Querying `"Update authentication"` extracts relevant auth controllers, services, routes, and decisions within configured token budget.
  - Modifying a public interface flags direct dependents for verification.

### Phase 4: Production CLI Implementation
- **Goal:** Complete, polished developer CLI executable (`repomind`).
- **Deliverables:**
  - `@repomind/cli`: Commander.js binary supporting `init`, `scan`, `refresh`, `status`, `context`, `diff`, `explain`, `decisions`, `mcp`, `agent`, `doctor`, `clean`.
  - Full support for `--json`, `--markdown`, `--budget`, `--project`.
- **Phase Gate (Exit Criteria):**
  - All CLI commands execute with proper exit codes (0 for success, 1+ for errors).
  - JSON output parses cleanly with zero diagnostic bleed into stdout.

### Phase 5: Universal MCP Server
- **Goal:** Official Model Context Protocol server exposing tools and resources for agents.
- **Deliverables:**
  - `@repomind/mcp-server`: stdio transport server implementing 12 tools and 6 resources.
  - Input validation via Zod schemas; strict project containment.
- **Phase Gate (Exit Criteria):**
  - Connects cleanly to official MCP inspector and clients.
  - Responds to `get_task_context` and `get_file_analysis` with verified data.

### Phase 6: Portable Agent Skill & Universal Adapters
- **Goal:** Agent skills and adapter installation for Antigravity, Cursor, Claude Code, Codex, and VS Code.
- **Deliverables:**
  - `skills/repomind-memory/`: Standard `SKILL.md`, protocol docs, verification scripts.
  - `@repomind/agent-adapters`: Installers for Antigravity, Cursor, Claude Code, Codex, VS Code.
- **Phase Gate (Exit Criteria):**
  - `repomind agent install antigravity` successfully scaffolds skill, MCP registration, and AGENTS.md rules.
  - Validation test ensures skill adheres to the Agent Skills standard.

### Phase 7: Session & Decision Memory Engine
- **Goal:** Cross-session agent continuity, task tracking, and architectural decision records (ADRs).
- **Deliverables:**
  - Session manager verifying agent-reported changes against Git state and file hashes.
  - Decision recording and topic-based retrieval.
- **Phase Gate (Exit Criteria):**
  - Session and decision records persist across restarts and are included in subsequent task context queries.

### Phase 8 & 9: Security Audit, Documentation & v1.0.0 Release
- **Goal:** Comprehensive unit/integration tests, security verification, documentation, and npm package configuration.
- **Deliverables:**
  - 100% test pass rate across unit, integration, and security test suites.
  - Complete documentation (README, PRD, TAD, ARCHITECTURE, DATABASE, CLI, MCP).
  - Package publishing configuration under `@repomind/*` and `repomind-cli`.

