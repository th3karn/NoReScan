# BugBrain — Command-Line Interface (CLI) Specification

**Executable:** `BugBrain`  
**Framework:** Commander.js  
**Package:** `BugBrain-cli` (or `@bugbrain/cli`)  

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

### `BugBrain init`
Initializes BugBrain in the current repository.
- Scans for existing Git or project configuration.
- Creates `.BugBrain/` directory with `config.json` and initializes `memory.db` with migrations.
- Creates `.BugBrainignore` if absent.

### `BugBrain scan`
Discovers and fingerprints all files in the project.
- Flags:
  - `--force`: Force re-indexing of all files regardless of cached hash.
  - `--dry-run`: Output discovered files without writing to database.
- Output:
  - Total files scanned, unchanged files, modified files, new files, deleted files.
  - Duration in milliseconds.

### `BugBrain status`
Displays the current memory and indexing health of the repository.
- Output summary:
  - Total indexed files, cache hit ratio, valid vs stale analyses.
  - Last scan timestamp and Git HEAD commit.
  - Number of tracked sessions and recorded architectural decisions.

### `BugBrain refresh`
Re-runs analysis specifically on stale or modified files and updates their dependency graphs.

### `BugBrain context "<task-description>"`
Retrieves task-relevant codebase context, dependency subgraphs, and historical decisions.
- Arguments:
  - `<task-description>`: Natural language query (e.g. `"Refactor authentication token rotation"`).
- Flags:
  - `--budget <tokens>`: Maximum token budget (default: 8,000 tokens ~ 32,000 characters).
  - `--format <markdown|json>`: Output format (default: markdown).
  - `--include-decisions`: Include matching architectural decisions (default: true).

### `BugBrain diff`
Shows files modified, added, or deleted since the last scan, including affected dependency blast radius.

### `BugBrain explain <path>`
Outputs stored structural analysis, extracted exports, imports, and downstream dependencies for a given file.

### `BugBrain decisions`
Lists or manages architectural decisions.
- `BugBrain decisions`: List all recorded ADRs.
- `BugBrain decisions add --title "<title>" --decision "<decision>" --rationale "<rationale>"`: Record a new ADR.

### `BugBrain history`
Shows previous agent sessions, modified files, and completion statuses.

### `BugBrain mcp`
Launches the BugBrain Model Context Protocol (MCP) server.
- Default transport: `stdio` (for integration with Antigravity, Cursor, Claude Code).
- Flags:
  - `--port <number>`: Optional HTTP transport mode.

### `BugBrain agent`
Installs agent integrations and skills.
- `BugBrain agent list`: Shows supported agents and detection status.
- `BugBrain agent install <agent>`: Installs rules, MCP config, and skill for target agent (`antigravity`, `cursor`, `claude-code`, `codex`, `vscode`, `--all`).

### `BugBrain doctor`
Runs comprehensive system diagnostics:
- Verifies SQLite database integrity (`PRAGMA integrity_check`).
- Verifies filesystem read/write access.
- Validates analyzer versions and schema migration versions.

### `BugBrain clean`
Removes stale cache records, clears session history, or resets the `.BugBrain` database.
- Flags:
  - `--all`: Complete purge and re-initialization.
  - `--stale`: Purge only obsolete analyses.

