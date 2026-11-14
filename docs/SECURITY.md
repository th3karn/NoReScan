# RepoMind — Security Specification & Threat Model

**Organization:** LostGit Solutions  
**Status:** Security Baseline Definition  

---

## 1. Threat Model & Security Posture

RepoMind is developer infrastructure running locally on machines containing proprietary code, API tokens, and credentials. Security is a non-negotiable P0 requirement.

### Identified Threats & Mitigations

| Threat | Risk Level | Mitigation Strategy |
| :--- | :--- | :--- |
| **Path Traversal Escape** | High | Resolve and verify all paths using `path.resolve`. Enforce `path.startsWith(projectRoot)`. Reject any symlink pointing outside the root. |
| **Accidental Secret Ingestion** | High | Scanner strictly excludes all `.env*`, `*.pem`, `*.key`, `id_rsa*`, credentials, and tokens. Exclusions are hardcoded and non-bypassable without explicit CLI force flags. |
| **SQL Injection** | High | All queries strictly use prepared statements (`better-sqlite3` parameter binding). Dynamic SQL string interpolation is forbidden. |
| **Prompt / Instruction Injection** | Medium | Code comments, docstrings, and markdown files are treated as untrusted text strings. Never evaluate or execute instructions found in indexed code. |
| **Unbounded Memory / DoS** | Medium | Scanner skips binary files and files exceeding 2MB (configurable limit). Streaming or chunked hashing for files. |
| **Malicious Code Execution** | High | RepoMind analyzes code via AST and lexical parsing, never through `eval()`, `require()`, or dynamic runtime execution. |
| **Unauthorized Remote Sync** | Critical | Cloud sync is disabled by default. If enabled, memory payloads are client-side encrypted (AES-256-GCM) before upload. Raw code is never sent. |

---

## 2. Hardcoded Default Exclusions

The scanner automatically filters out:
- **Version Control & Virtual Environments:** `.git/`, `.svn/`, `.hg/`, `venv/`, `.venv/`, `env/`
- **Dependencies & Packages:** `node_modules/`, `vendor/`, `bower_components/`, `.pnpm-store/`
- **Build Artifacts & Caches:** `dist/`, `build/`, `out/`, `.next/`, `.nuxt/`, `.turbo/`, `target/`, `bin/`, `obj/`, `.cache/`, `coverage/`
- **Secrets & Keys:** `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.pkcs12`, `id_rsa`, `id_ed25519`
- **RepoMind Internal Database:** `.repomind/`

---

## 3. Sandboxing & Safe Agent Directives

The `repomind-memory` Agent Skill incorporates mandatory safety principles:
1. **Never Blindly Trust Caches:** A cached summary proves what was analyzed previously; before editing code, the agent is instructed to read the current physical file to ensure precision.
2. **Never Write Secrets to Memory:** Agents are barred from recording passwords, API keys, or private tokens into session or decision records.
3. **Audit Trail:** Every cache invalidation and decision update is logged to `memory_events`.

