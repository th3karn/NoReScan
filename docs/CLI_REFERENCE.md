# BugBrain — CLI Command Reference

**Executable:** `bugbrain`  

---

## Command Matrix

| Command | Usage | Description |
| :--- | :--- | :--- |
| `init` | `bugbrain init [--path <path>] [--force] [--json]` | Initialize BugBrain in the repository |
| `scan` | `bugbrain scan [--full] [--path <dir>] [--json]` | Incrementally scan and index files |
| `refresh` | `bugbrain refresh [--force] [--file <path>]` | Re-analyze modified or stale files |
| `status` | `bugbrain status [--verbose] [--json]` | Display cache freshness and stats |
| `context` | `bugbrain context <query> [--budget <tokens>] [--format json\|markdown]` | Retrieve task-specific context manifest |
| `analyze` | `bugbrain analyze <path> [--all]` | Trigger explicit structural AST analysis |
| `explain` | `bugbrain explain <path>` | Explain stored analysis, exports, dependencies |
| `diff` | `bugbrain diff [--since <commit>]` | Display modified files and blast radius |
| `deps` | `bugbrain deps <path> [--tree] [--circular]` | Inspect module dependency relationships |
| `search` | `bugbrain search <query> [--limit <n>]` | Deterministic search across memory |
| `decisions`| `bugbrain decisions [list\|add\|show\|delete]` | View or record architectural decisions (ADRs) |
| `history` | `bugbrain history [--limit <n>]` | View session and task history |
| `watch` | `bugbrain watch [--debounce <ms>]` | Continuously watch filesystem for changes |
| `mcp` | `bugbrain mcp [start\|status]` | Launch Model Context Protocol server |
| `agent` | `bugbrain agent [list\|install\|uninstall]` | Install agent configuration adapters |
| `skill` | `bugbrain skill [list\|install\|validate]` | Manage and validate Agent Skills |
| `doctor` | `bugbrain doctor [--fix]` | Run database and integrity diagnostics |
| `clean` | `bugbrain clean [--stale\|--all\|--dry-run]` | Purge stale cache records or reset memory |
| `export` | `bugbrain export [--output <file>]` | Export memory database to JSON backup |
| `import` | `bugbrain import <file>` | Import memory database from JSON backup |
| `db` | `bugbrain db [status\|migrate\|backup]` | Database status, migrations, and backups |
| `config` | `bugbrain config [list\|get\|set\|reset]` | Read or update workspace configuration |
