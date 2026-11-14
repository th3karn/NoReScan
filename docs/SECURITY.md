# code-cache — Security & Threat Model

**Organization:** LostGit Solutions  
**Repository:** [https://github.com/th3karn/code-cache](https://github.com/th3karn/code-cache)  

---

## 1. Threat Model & Security Posture

| Threat | Risk Level | Mitigation Strategy |
| :--- | :--- | :--- |
| **Path Traversal Escape** | High | All paths are resolved and validated via `assertPathContained`. Symlinks or relative paths escaping `projectRoot` are rejected. |
| **Accidental Secret Ingestion** | High | Scanner hard-filters all `.env*`, `*.pem`, `*.key`, `id_rsa*`, and credential directories. |
| **SQL Injection** | High | All database operations use strictly parameterized prepared statements in SQLite. Dynamic SQL concatenation is prohibited. |
| **Untrusted Code Execution** | High | code-cache parses code using static AST analysis and lexical regex, never through `eval()`, `require()`, or running repository code. |
| **Prompt Injection** | Medium | Code comments, docstrings, and markdown summaries are treated as untrusted data strings, never executed instructions. |

---

## 2. Hardcoded Default Exclusions

- **Version Control & Environments:** `.git/`, `.svn/`, `venv/`, `.venv/`
- **Dependencies & Caches:** `node_modules/`, `vendor/`, `.turbo/`, `.cache/`, `dist/`, `build/`
- **Secrets & Credentials:** `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa`, `id_ed25519`
- **code-cache Database:** `.code-cache/`
