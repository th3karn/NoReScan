# norescan — Database Specification & Schema Architecture

**Database Engine:** SQLite (via `better-sqlite3`)  
**Storage Location:** `.norescan/memory.db`  
**Journal Mode:** Write-Ahead Logging (WAL)  
**Synchronous Mode:** NORMAL (optimal balance of ACID safety and performance)  

---

## 1. Schema Overview & Entity Relationship

```
 +--------------------+       1:N       +---------------------+
 |      projects      | <-------------> |        files        |
 +--------------------+                 +---------------------+
           |                                       |
           | 1:N                                   | 1:N
           v                                       v
 +--------------------+                 +---------------------+
 |      sessions      |                 |      analyses       |
 +--------------------+                 +---------------------+
           |                                       |
           | 1:N                                   |
           v                                       |
 +--------------------+                            |
 |       tasks        |                            |
 +--------------------+                            v
           |                            +---------------------+
           | 1:N                        |    dependencies     |
           v                            +---------------------+
 +--------------------+
 |     task_files     |
 +--------------------+
           |
           +---------------------------> +--------------------+
                                         |     decisions      |
                                         +--------------------+
```

---

## 2. Table Definitions

### 2.1 `projects`
Stores registered workspaces and root paths.
```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  root_path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  config_hash TEXT NOT NULL,
  sync_enabled INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_root_path ON projects(root_path);
```

### 2.2 `files`
Tracks every indexed file in the repository.
```sql
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  language TEXT,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'valid', 'stale', 'untracked', 'deleted'
  last_scanned_at TEXT NOT NULL,
  UNIQUE(project_id, relative_path),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_files_project_path ON files(project_id, relative_path);
CREATE INDEX IF NOT EXISTS idx_files_content_hash ON files(content_hash);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
```

### 2.3 `file_versions`
Historical record of past fingerprints and file modifications.
```sql
CREATE TABLE IF NOT EXISTS file_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id);
```

### 2.4 `analyses`
Cached structural and AST analysis for each file snapshot.
```sql
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  summary TEXT NOT NULL,
  ast_metadata TEXT NOT NULL, -- JSON serialized AST metadata (exports, imports, routes, symbols)
  analyzer_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'valid', 'stale', 'needs_reanalysis'
  created_at TEXT NOT NULL,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_analyses_file_hash ON analyses(file_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
```

### 2.5 `dependencies`
Tracks directed relationships between files and symbols.
```sql
CREATE TABLE IF NOT EXISTS dependencies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_file_id TEXT NOT NULL,
  target_file_id TEXT,
  target_path TEXT NOT NULL, -- Unresolved or resolved import path
  dependency_type TEXT NOT NULL, -- 'import', 'type_reference', 'config', 'dynamic_import'
  confidence REAL DEFAULT 1.0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(source_file_id) REFERENCES files(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_file_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_file_id);
```

### 2.6 `sessions`
Agent session histories.
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL, -- 'antigravity', 'cursor', 'claude-code', 'cli', etc.
  started_at TEXT NOT NULL,
  ended_at TEXT,
  summary TEXT,
  metadata TEXT, -- JSON details (e.g. prompt, environment)
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id, started_at);
```

### 2.7 `tasks`
Discrete tasks attempted or completed within a session.
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  session_id TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'in_progress', 'completed', 'failed'
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
```

### 2.8 `task_files`
Files inspected, modified, or generated during a task.
```sql
CREATE TABLE IF NOT EXISTS task_files (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'inspected', 'modified', 'created', 'deleted'
  recorded_at TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_files_task ON task_files(task_id);
```

### 2.9 `decisions`
Explicit Architectural Decision Records (ADRs) captured across sessions.
```sql
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  session_id TEXT,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  decision TEXT NOT NULL,
  affected_files TEXT, -- JSON array of file paths
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id, created_at);
```

### 2.10 `memory_events`
Audit trail of memory updates, cache invalidations, and sync checkpoints.
```sql
CREATE TABLE IF NOT EXISTS memory_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'scan_completed', 'cache_invalidated', 'decision_added'
  details TEXT NOT NULL, -- JSON
  occurred_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_memory_events_time ON memory_events(project_id, occurred_at);
```

### 2.11 `schema_migrations`
Tracks database schema migrations.
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
```

---

## 3. Migration Runner

The database module includes a forward migration engine:
- Reads sequentially numbered migration scripts (`001_initial_schema.sql`, `002_...sql`).
- Executes each migration in a single SQLite transaction.
- Verifies migration integrity and enforces zero data loss on updates.

