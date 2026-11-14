# RepoMind — Architecture Decision Records (ADRs)

---

## ADR-0001: Local-First Persistence with SQLite and WAL Mode
- **Status:** Superseded by ADR-0001B
- **Context:** AI coding agents need immediate, low-latency (<50ms) access to file fingerprints, AST caches, and dependency relationships without network dependencies or paid API keys.
- **Decision:** Use SQLite as the primary local storage engine. Enable Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and `PRAGMA synchronous = NORMAL`.

---

## ADR-0001B: Migration to Native `node:sqlite` (Built into Node.js 22+)
- **Status:** Accepted
- **Context:** Node.js 22+ (including Node 26) ships with high-performance native `node:sqlite` (`DatabaseSync`). External C++ npm bindings like `better-sqlite3` require Visual Studio C++ build tools on Windows and fail when prebuilt binaries are unavailable for cutting-edge Node versions.
- **Decision:** Utilize Node.js native `node:sqlite` as the primary local SQLite driver.
- **Consequences:** Eliminates external C++ compilers, `node-gyp`, and native installation failures on Windows. Preserves synchronous execution, WAL mode, prepared statements, and ACID guarantees with zero external dependencies.

---

## ADR-0002: SHA-256 for Cryptographic File Fingerprints
- **Status:** Accepted
- **Context:** Relying solely on modification timestamps (`mtime`) is prone to false positives (e.g. `git checkout`, `touch`) and false negatives.
- **Decision:** Use SHA-256 content hashes generated via Node.js native `crypto.createHash('sha256')`. Normalize CRLF/LF line endings before hashing for cross-platform Git checkouts.
- **Consequences:** Deterministic change detection. Zero risk of hash collisions in code repositories.

---

## ADR-0003: Conservative Dependency Invalidation
- **Status:** Accepted
- **Context:** Invalidation must not re-analyze the entire repository on every small commit, but serving stale public interface contracts leads to AI hallucinations.
- **Decision:** When file `F` is modified, re-parse `F`. If `F`'s exported interface (names, types, signatures) changed, flag all immediate reverse dependencies (blast radius) as `stale`. If only private implementation changed, retain dependent analysis caches as `valid`.
- **Consequences:** Dramatically limits cascading re-analysis while guaranteeing correctness across boundaries.

---

## ADR-0004: Official Model Context Protocol (MCP) TypeScript SDK
- **Status:** Accepted
- **Context:** Agents need a standard, vendor-neutral protocol to query RepoMind.
- **Decision:** Implement MCP server using official `@modelcontextprotocol/sdk` supporting `stdio` transport for local agents.
- **Consequences:** Native, out-of-the-box compatibility with Google Antigravity, Cursor, Windsurf, Claude Code, and future MCP clients.

---

## ADR-0005: Strict Boundary Containment & Secret Exclusion
- **Status:** Accepted
- **Context:** AI coding tools must never expose private keys, credentials, or escape repository boundaries.
- **Decision:** Scanner hard-filters all `.env*`, `*.pem`, `*.key`, `id_rsa*` files. Reject path traversal (`../`) and external symlinks. Parameterize 100% of SQL queries.
- **Consequences:** Guarantees repository privacy and security.

---

## ADR-0006: Deterministic First, Semantic Optional
- **Status:** Accepted
- **Context:** Heavy vector databases and remote embedding APIs introduce cost, network latency, and indeterminacy.
- **Decision:** Primary context engine uses deterministic AST symbol matching, path scoring, and dependency graph proximity. Vector search is an optional future plugin.
- **Consequences:** Instantaneous (<300ms) context retrieval with 0 token cost and 100% deterministic reproducibility.
