# code-cache — CLI Command Reference

**Executable:** `code-cache`  

---

## Command Matrix

| Command | Usage | Description |
| :--- | :--- | :--- |
| `init` | `code-cache init [--path <path>] [--force] [--json]` | Initialize code-cache in the repository |
| `scan` | `code-cache scan [--full] [--path <dir>] [--json]` | Incrementally scan and index files |
| `refresh` | `code-cache refresh [--force] [--file <path>]` | Re-analyze modified or stale files |
| `status` | `code-cache status [--verbose] [--json]` | Display cache freshness and stats |
| `context` | `code-cache context <query> [--budget <tokens>] [--format json\|markdown]` | Retrieve task-specific context manifest |
| `analyze` | `code-cache analyze <path> [--all]` | Trigger explicit structural AST analysis |
| `explain` | `code-cache explain <path>` | Explain stored analysis, exports, dependencies |
| `diff` | `code-cache diff [--since <commit>]` | Display modified files and blast radius |
| `deps` | `code-cache deps <path> [--tree] [--circular]` | Inspect module dependency relationships |
| `search` | `code-cache search <query> [--limit <n>]` | Deterministic search across memory |
| `decisions`| `code-cache decisions [list\|add\|show\|delete]` | View or record architectural decisions (ADRs) |
| `history` | `code-cache history [--limit <n>]` | View session and task history |
| `watch` | `code-cache watch [--debounce <ms>]` | Continuously watch filesystem for changes |
| `mcp` | `code-cache mcp [start\|status]` | Launch Model Context Protocol server |
| `agent` | `code-cache agent [list\|install\|uninstall]` | Install agent configuration adapters |
| `skill` | `code-cache skill [list\|install\|validate]` | Manage and validate Agent Skills |
| `doctor` | `code-cache doctor [--fix]` | Run database and integrity diagnostics |
| `clean` | `code-cache clean [--stale\|--all\|--dry-run]` | Purge stale cache records or reset memory |
| `export` | `code-cache export [--output <file>]` | Export memory database to JSON backup |
| `import` | `code-cache import <file>` | Import memory database from JSON backup |
| `db` | `code-cache db [status\|migrate\|backup]` | Database status, migrations, and backups |
| `config` | `code-cache config [list\|get\|set\|reset]` | Read or update workspace configuration |

