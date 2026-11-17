# norescan — Implementation Roadmap & Acceptance Gates

**Product:** norescan  
**Organization:** LostGit Solutions  
**Repository:** [https://github.com/th3karn/norescan](https://github.com/th3karn/norescan)  

---

## Roadmap

### v0.1.2 — Foundation & Local Core (Released & Verified on npm)
- Universal monorepo architecture (`pnpm` + TypeScript strict mode).
- Deterministic SHA-256 fingerprinting with CRLF/LF normalization.
- Native SQLite persistence in WAL mode (`.norescan/norescan.db`).
- Recursive file scanner with `.gitignore` and hardcoded secret exclusions (`.env*`, `*.pem`, `*.key`).
- Multi-language AST parsers for TypeScript, JavaScript, Python, SQL, and JSON.
- Module dependency graph with cycle detection and conservative invalidation.
- Task context engine with multi-vector scoring and token budgeting.
- Full CLI executable (`norescan`) with 20+ commands.
- Model Context Protocol (MCP) server over `stdio` with 27 tools and 6 resources.
- Automated code healing & diagnostic error fixer (`FixerEngine`, `ErrorParser`).
- Portable Agent Skill (`norescan-memory`).
- Adapters for Google Antigravity, Cursor, Claude Code, OpenAI Codex, and VS Code.
- All 13 packages published on npm under `@norescan/*` and 100% verified.

### v0.2.0 — Extended Language & IDE Integration
- Tree-sitter parsers for C/C++, Java, Rust, and Go.
- Direct VS Code extension companion.
- Real-time watcher daemon mode.

### v1.0.0 — Commercial Cloud Control Plane (Open Core + SaaS)
*Refer to [MONETIZATION_AND_BUSINESS_MODEL.md](file:///E:/Clg_Projects/RepoMind CLI/docs/MONETIZATION_AND_BUSINESS_MODEL.md) for full monetization and architectural specification.*
- **Phase 2:** Cloud Identity, Supabase Auth & Device Pairing CLI (`norescan login`).
- **Phase 3:** Client-side zero-knowledge encrypted memory sync (AES-256-GCM envelope encryption).
- **Phase 4:** Billing engine & signed entitlement verification (Razorpay for India + Paddle for Global MoR).
- **Phase 5:** Team shared memory, RBAC, organization workspaces, and centralized agent configurations.
- **Phase 6:** Enterprise self-hosted VPC, SAML SSO, audit log export, and extension marketplace.
