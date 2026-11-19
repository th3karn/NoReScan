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

### v1.0.0 — Commercial Cloud Control Plane (Open Core + SaaS) — All Phases Implemented & Verified ✅
*Refer to [MONETIZATION_AND_BUSINESS_MODEL.md](file:///E:/Clg_Projects/RepoMind CLI/docs/MONETIZATION_AND_BUSINESS_MODEL.md) for full monetization and architectural specification.*
- **Phase 1: Open-Source Engine & CLI (Verified 100% on npm v0.1.2):** 13 published packages, local SQLite WAL, AST parsers, MCP server, and auto-fixer.
- **Phase 2: Cloud Identity, Credentials & Device Pairing (`norescan login`, `logout`, `whoami`, `devices`):** Secure credentials store (`~/.norescan/credentials.json`), AuthManager, and device pairing.
- **Phase 3: Client-Side Zero-Knowledge Encryption & Encrypted Backup (`norescan backup`, `restore`):** AES-256-GCM envelope encryption, scrypt key derivation, zero source code upload guarantee, and encrypted repository snapshots.
- **Phase 4: Billing Engine & Provider Abstraction (`norescan billing plan`, `checkout`):** Razorpay (India: UPI/cards in INR), Paddle (Global MoR in USD), Stripe adapter, HMAC-SHA256 webhook verification, idempotent processing, and signed entitlements.
- **Phase 5: Team Workspace Collaboration & RBAC (`norescan team create`, `invite`, `config`):** Multi-tenant organization workspaces, member roles (`owner`, `admin`, `member`, `read_only`), seat limit enforcement, and centralized team agent configs (`.cursorrules`, `AGENTS.md`).
- **Phase 6: Enterprise Audit Trail & Ecosystem Marketplace (`norescan enterprise audit`, `marketplace list`):** Tamper-evident SHA-256 chained audit logs (SOC2/ISO 27001), VPC/air-gapped validator, and extension registry.
