# norescan — CLI Command Reference

**Executable:** `norescan`  

---

## Command Matrix

| Command | Usage | Description |
| :--- | :--- | :--- |
| `init` | `norescan init [--path <path>] [--force] [--json]` | Initialize norescan in the repository |
| `scan` | `norescan scan [--full] [--path <dir>] [--json]` | Incrementally scan and index files |
| `refresh` | `norescan refresh [--force] [--file <path>]` | Re-analyze modified or stale files |
| `status` | `norescan status [--verbose] [--json]` | Display cache freshness and stats |
| `context` | `norescan context <query> [--budget <tokens>] [--format json\|markdown]` | Retrieve task-specific context manifest |
| `analyze` | `norescan analyze <path> [--all]` | Trigger explicit structural AST analysis |
| `explain` | `norescan explain <path>` | Explain stored analysis, exports, dependencies |
| `diff` | `norescan diff [--since <commit>]` | Display modified files and blast radius |
| `deps` | `norescan deps <path> [--tree] [--circular]` | Inspect module dependency relationships |
| `search` | `norescan search <query> [--limit <n>]` | Deterministic search across memory |
| `decisions`| `norescan decisions [list\|add\|show\|delete]` | View or record architectural decisions (ADRs) |
| `history` | `norescan history [--limit <n>]` | View session and task history |
| `watch` | `norescan watch [--debounce <ms>]` | Continuously watch filesystem for changes |
| `mcp` | `norescan mcp [start\|status]` | Launch Model Context Protocol server |
| `agent` | `norescan agent [list\|install\|uninstall]` | Install agent configuration adapters |
| `skill` | `norescan skill [list\|install\|validate]` | Manage and validate Agent Skills |
| `doctor` | `norescan doctor [--fix]` | Run database and integrity diagnostics |
| `clean` | `norescan clean [--stale\|--all\|--dry-run]` | Purge stale cache records or reset memory |
| `export` | `norescan export [--output <file>]` | Export memory database to JSON backup |
| `import` | `norescan import <file>` | Import memory database from JSON backup |
| `db` | `norescan db [status\|migrate\|backup]` | Database status, migrations, and backups |
| `config` | `norescan config [list\|get\|set\|reset]` | Read or update workspace configuration |

