# Changelog

All notable changes to RepoMind will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-14

### Added
- **Monorepo Foundation:** Turbo + pnpm workspaces with strict TypeScript strict mode.
- **Fingerprint Engine (`@repomind/fingerprint`):** Deterministic SHA-256 content hashing with CRLF-to-LF line ending normalization.
- **File Scanner (`@repomind/scanner`):** Recursive file walker with `.gitignore`, `.repomindignore`, and hardcoded secret file exclusions (`.env*`, `*.pem`, `*.key`).
- **Persistence Engine (`@repomind/database`):** Native `node:sqlite` database in WAL mode with forward migration runner and typed repositories.
- **AST Analyzer (`@repomind/analyzer`):** Multi-language structural parsers for TypeScript, JavaScript, Python, SQL, and configuration files.
- **Dependency Graph (`@repomind/dependency-graph`):** Module dependency graph with transitive blast-radius calculation and conservative invalidation.
- **Context Engine (`@repomind/context-engine`):** Natural-language task context ranking and token budgeting engine.
- **CLI (`repomind`):** Comprehensive developer CLI with commands (`init`, `scan`, `status`, `context`, `explain`, `decisions`, `doctor`, `clean`, `agent`).
- **MCP Server (`@repomind/mcp`):** Model Context Protocol server exposing 10 tools and 3 resources over stdio.
- **Portable Agent Skill (`skills/repomind-memory`):** Open Agent Skills specification standard for persistent codebase memory.
- **Universal Agent Adapters (`@repomind/agent-adapters`):** Installers for Google Antigravity, Cursor, Claude Code, OpenAI Codex, and VS Code.
