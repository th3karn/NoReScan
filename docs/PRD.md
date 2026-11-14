# code-cache — Product Requirements Document (PRD)

**Product:** code-cache  
**Tagline:** "Your AI's brain for your codebase."  
**Repository:** [https://github.com/th3karn/code-cache](https://github.com/th3karn/code-cache)  
**Organization:** LostGit Solutions  
**GitHub Owner:** th3karn  
**Status:** Living Product Specification  
**Current Milestone:** v0.1.0 Architecture & Release  

---

## 1. Product Vision & Value Proposition

AI coding assistants (Google Antigravity, Cursor, Claude Code, OpenAI Codex, GitHub Copilot) accelerate software engineering, but suffer from chronic codebase amnesia:
- They repeatedly scan and parse unchanged files across turns and sessions.
- They repeatedly rediscover architecture, API routes, database schemas, and dependencies.
- They waste significant developer token budget and time waiting for context re-discovery.
- They lose historical technical decisions, introducing regressions or overwriting previous architectural consensus.

**code-cache** is a universal, persistent, local-first codebase-memory infrastructure. It maintains a verified cryptographic snapshot of the repository, a module dependency graph, an architectural knowledge layer, and a decision log.

---

## 2. Core Product Principles

1. **Deterministic Verification First:** Content identity is proven using SHA-256 cryptographic fingerprints with normalized line endings.
2. **Local-First & Private:** Default storage is 100% offline in `.code-cache/code-cache.db` via SQLite in WAL mode. Zero source code or credentials are ever transmitted externally.
3. **Conservative Invalidation:** If an internal function body changes without modifying public exported interfaces, dependent module analyses remain valid.
4. **Universal Agent Neutrality:** Standardized integration through Model Context Protocol (MCP stdio/HTTP), Open Agent Skills, and configuration adapters for Google Antigravity, Cursor, Claude Code, OpenAI Codex, and VS Code.
5. **Seamless Legacy Migration:** Safe, non-destructive migration from legacy `.repomind/` to `.code-cache/` with automatic backups.

---

## 3. Functional Requirements

| ID | Requirement | Priority | Status |
| :--- | :--- | :---: | :---: |
| **FR-01** | Project Initialization (`code-cache init`) with `.code-cache/` config | P0 | Verified |
| **FR-02** | Safe Legacy Migration from `.repomind/` to `.code-cache/` | P0 | Built |
| **FR-03** | Cryptographic SHA-256 Fingerprinting & Change Diffing | P0 | Verified |
| **FR-04** | File Scanner with `.gitignore` and Secret Exclusion (`.env*`, `*.pem`, `*.key`) | P0 | Verified |
| **FR-05** | Native SQLite Persistence in WAL mode (`.code-cache/code-cache.db`) | P0 | Verified |
| **FR-06** | Multi-Language Structural AST Parsers (TS/JS, Python, SQL, JSON) | P0 | Verified |
| **FR-07** | Module Dependency Graph & Conservative Blast-Radius Invalidation | P0 | Verified |
| **FR-08** | Task Context Retrieval Engine & Token Budgeter (`code-cache context`) | P0 | Verified |
| **FR-09** | Full CLI Command Suite (`code-cache` executable with 20+ commands) | P0 | Verified |
| **FR-10** | Universal MCP Server (`code-cache` stdio server with 14 tools & 6 resources) | P0 | Verified |
| **FR-11** | Portable Agent Skill (`code-cache-memory`) adhering to Open Agent Skills standard | P0 | Verified |
| **FR-12** | Universal Adapters (Google Antigravity, Cursor, Claude Code, Codex, VS Code) | P0 | Verified |
| **FR-13** | Architectural Decision Records (ADRs) & Session History Management | P1 | Verified |
| **FR-14** | Live File Watcher (`code-cache watch` via Chokidar) | P1 | Verified |
| **FR-15** | Database Maintenance (`code-cache db status|migrate|backup`, `doctor --fix`) | P1 | Verified |
