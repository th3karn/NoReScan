# Changelog

All notable changes to code-cache will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-14

### Added
- **Product Identity:** Transitioned to **code-cache** under [https://github.com/th3karn/code-cache](https://github.com/th3karn/code-cache) (LostGit Solutions).
- **Legacy Migration Engine:** Automated non-destructive migration from legacy `.repomind/` to `.code-cache/` with timestamped backups.
- **Monorepo Foundation:** Turbo + pnpm workspaces with strict TypeScript strict mode.
- **Fingerprint Engine (`@code-cache/fingerprint`):** Deterministic SHA-256 content hashing with CRLF-to-LF line ending normalization.
- **File Scanner (`@code-cache/scanner`):** Recursive file walker with `.gitignore`, `.code-cacheignore`, and hardcoded secret exclusions (`.env*`, `*.pem`, `*.key`).
- **Persistence Engine (`@code-cache/database`):** Native `node:sqlite` database in WAL mode with forward migration runner and typed repositories in `.code-cache/code-cache.db`.
- **AST Analyzer (`@code-cache/analyzer`):** Multi-language structural parsers for TypeScript, JavaScript, Python, SQL, and JSON.
- **Dependency Graph (`@code-cache/dependency-graph`):** Module dependency graph with transitive blast-radius calculation and conservative invalidation.
- **Context Engine (`@code-cache/context-engine`):** Natural-language task context ranking and token budgeting engine.
- **CLI (`code-cache`):** Comprehensive developer CLI with 20+ commands (`init`, `scan`, `status`, `context`, `analyze`, `explain`, `diff`, `deps`, `search`, `decisions`, `history`, `watch`, `mcp`, `agent`, `skill`, `doctor`, `clean`, `export`, `import`, `db`, `config`).
- **MCP Server (`@code-cache/mcp`):** Model Context Protocol server exposing 14 tools and 6 resources over stdio.
- **Portable Agent Skill (`skills/code-cache-memory`):** Open Agent Skills specification standard for persistent codebase memory.
- **Universal Agent Adapters (`@code-cache/agent-adapters`):** Installers for Google Antigravity, Cursor, Claude Code, OpenAI Codex, and VS Code.

