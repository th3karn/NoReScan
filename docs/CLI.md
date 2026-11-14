# norescan — Command-Line Interface (CLI) Specification

**Executable:** `norescan`  
**Framework:** Commander.js  
**Package:** `norescan-cli` (or `@norescan/cli`)  

---

## 1. Global Flags & Output Formatting

Every command supports standard global flags:
- `--json`: Output pure, parseable JSON to stdout (diagnostics/logs go to stderr).
- `--markdown`: Output formatted Markdown (default for context).
- `--verbose`: Enable detailed debug logging.
- `--quiet`: Suppress non-essential output.
- `--no-color`: Disable ANSI color codes.
- `--project <path>`: Specify project root (defaults to `process.cwd()`).

---

## 2. Command Reference

### `norescan init`
Initializes norescan in the current repository.
- Scans for existing Git or project configuration.
- Creates `.norescan/` directory with `config.json` and initializes `memory.db` with migrations.
- Creates `.norescanignore` if absent.

### `norescan scan`
Discovers and fingerprints all files in the project.
- Flags:
  - `--force`: Force re-indexing of all files regardless of cached hash.
  - `--dry-run`: Output discovered files without writing to database.
- Output:
  - Total files scanned, unchanged files, modified files, new files, deleted files.
  - Duration in milliseconds.

### `norescan status`
Displays the current memory and indexing health of the repository.
- Output summary:
  - Total indexed files, cache hit ratio, valid vs stale analyses.
  - Last scan timestamp and Git HEAD commit.
  - Number of tracked sessions and recorded architectural decisions.

### `norescan refresh`
Re-runs analysis specifically on stale or modified files and updates their dependency graphs.

### `norescan context "<task-description>"`
Retrieves task-relevant codebase context, dependency subgraphs, and historical decisions.
- Arguments:
  - `<task-description>`: Natural language query (e.g. `"Refactor authentication token rotation"`).
- Flags:
  - `--budget <tokens>`: Maximum token budget (default: 8,000 tokens ~ 32,000 characters).
  - `--format <markdown|json>`: Output format (default: markdown).
  - `--include-decisions`: Include matching architectural decisions (default: true).

### `norescan diff`
Shows files modified, added, or deleted since the last scan, including affected dependency blast radius.

### `norescan explain <path>`
Outputs stored structural analysis, extracted exports, imports, and downstream dependencies for a given file.

### `norescan decisions`
Lists or manages architectural decisions.
- `norescan decisions`: List all recorded ADRs.
- `norescan decisions add --title "<title>" --decision "<decision>" --rationale "<rationale>"`: Record a new ADR.

### `norescan history`
Shows previous agent sessions, modified files, and completion statuses.

### `norescan mcp`
Launches the norescan Model Context Protocol (MCP) server.
- Default transport: `stdio` (for integration with Antigravity, Cursor, Claude Code).
- Flags:
  - `--port <number>`: Optional HTTP transport mode.

### `norescan agent`
Installs agent integrations and skills.
- `norescan agent list`: Shows supported agents and detection status.
- `norescan agent install <agent>`: Installs rules, MCP config, and skill for target agent (`antigravity`, `cursor`, `claude-code`, `codex`, `vscode`, `--all`).

### `norescan doctor`
Runs comprehensive system diagnostics:
- Verifies SQLite database integrity (`PRAGMA integrity_check`).
- Verifies filesystem read/write access.
- Validates analyzer versions and schema migration versions.

### `norescan clean`
Removes stale cache records, clears session history, or resets the `.norescan` database.
- Flags:
  - `--all`: Complete purge and re-initialization.
  - `--stale`: Purge only obsolete analyses.

