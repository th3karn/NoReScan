# Changelog

All notable changes to norescan will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-14

### Added
- **Monorepo Foundation:** Turbo + pnpm workspaces with strict TypeScript strict mode.
- **Fingerprint Engine (`@norescan/fingerprint`):** Deterministic SHA-256 content hashing with CRLF-to-LF line ending normalization.
- **File Scanner (`@norescan/scanner`):** Recursive file walker with `.gitignore`, `.norescanignore`, and hardcoded secret file exclusions (`.env*`, `*.pem`, `*.key`).
- **Persistence Engine (`@norescan/database`):** Native `node:sqlite` database in WAL mode with forward migration runner and typed repositories.
- **AST Analyzer (`@norescan/analyzer`):** Multi-language structural parsers for TypeScript, JavaScript, Python, SQL, and configuration files.
- **Dependency Graph (`@norescan/dependency-graph`):** Module dependency graph with transitive blast-radius calculation and conservative invalidation.
- **Context Engine (`@norescan/context-engine`):** Natural-language task context ranking and token budgeting engine.
- **CLI (`norescan`):** Comprehensive developer CLI with commands (`init`, `scan`, `status`, `context`, `explain`, `decisions`, `doctor`, `clean`, `agent`).
- **MCP Server (`@norescan/mcp`):** Model Context Protocol server exposing 10 tools and 3 resources over stdio.
- **Portable Agent Skill (`skills/norescan-memory`):** Open Agent Skills specification standard for persistent codebase memory.
- **Universal Agent Adapters (`@norescan/agent-adapters`):** Installers for Google Antigravity, Cursor, Claude Code, OpenAI Codex, and VS Code.

