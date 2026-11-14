# code-cache — Implementation Roadmap & Acceptance Gates

**Product:** code-cache  
**Organization:** LostGit Solutions  
**Repository:** [https://github.com/th3karn/code-cache](https://github.com/th3karn/code-cache)  

---

## Roadmap

### v0.1.0 — Foundation & Local Core (Current Release)
- Universal monorepo architecture (`pnpm` + TypeScript strict mode).
- Deterministic SHA-256 fingerprinting with CRLF/LF normalization.
- Native SQLite persistence in WAL mode (`.code-cache/code-cache.db`).
- Recursive file scanner with `.gitignore` and hardcoded secret exclusions (`.env*`, `*.pem`, `*.key`).
- Multi-language AST parsers for TypeScript, JavaScript, Python, SQL, and JSON.
- Module dependency graph with cycle detection and conservative invalidation.
- Task context engine with multi-vector scoring and token budgeting.
- Full CLI executable (`code-cache`) with 20+ commands.
- Model Context Protocol (MCP) server over `stdio` with 14 tools and 6 resources.
- Portable Agent Skill (`code-cache-memory`).
- Adapters for Google Antigravity, Cursor, Claude Code, OpenAI Codex, and VS Code.
- Legacy `.repomind/` to `.code-cache/` migration engine with backups.

### v0.2.0 — Extended Language & IDE Integration
- Tree-sitter parsers for C/C++, Java, Rust, and Go.
- Direct VS Code extension companion.
- Real-time watcher daemon mode.

### v1.0.0 — Team & Cloud Synchronization (Optional Phase)
- Optional client-side encrypted sync (AES-256-GCM).
- Multi-device team memory sync.
