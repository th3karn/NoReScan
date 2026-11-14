# Changelog

All notable changes to norescan will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-14

### Added
- **Product Identity:** Transitioned to **norescan** under [https://github.com/th3karn/norescan](https://github.com/th3karn/norescan) (LostGit Solutions).
- **Legacy Migration Engine:** Automated non-destructive migration from legacy `.repomind/` to `.norescan/` with timestamped backups.
- **Monorepo Foundation:** Turbo + pnpm workspaces with strict TypeScript strict mode.
- **Fingerprint Engine (`@norescan/fingerprint`):** Deterministic SHA-256 content hashing with CRLF-to-LF line ending normalization.
- **File Scanner (`@norescan/scanner`):** Recursive file walker with `.gitignore`, `.norescanignore`, and hardcoded secret exclusions (`.env*`, `*.pem`, `*.key`).
- **Persistence Engine (`@norescan/database`):** Native `node:sqlite` database in WAL mode with forward migration runner and typed repositories in `.norescan/norescan.db`.
- **AST Analyzer (`@norescan/analyzer`):** Multi-language structural parsers for TypeScript, JavaScript, Python, SQL, and JSON.
- **Dependency Graph (`@norescan/dependency-graph`):** Module dependency graph with transitive blast-radius calculation and conservative invalidation.
- **Context Engine (`@norescan/context-engine`):** Natural-language task context ranking and token budgeting engine.
- **CLI (`norescan`):** Comprehensive developer CLI with 20+ commands (`init`, `scan`, `status`, `context`, `analyze`, `explain`, `diff`, `deps`, `search`, `decisions`, `history`, `watch`, `mcp`, `agent`, `skill`, `doctor`, `clean`, `export`, `import`, `db`, `config`).
- **MCP Server (`@norescan/mcp`):** Model Context Protocol server exposing 14 tools and 6 resources over stdio.
- **Portable Agent Skill (`skills/norescan-memory`):** Open Agent Skills specification standard for persistent codebase memory.
- **Universal Agent Adapters (`@norescan/agent-adapters`):** Installers for Google Antigravity, Cursor, Claude Code, OpenAI Codex, and VS Code.

