# code-cache — Database Schema Specification

**Database File:** `.code-cache/code-cache.db`  
**Engine:** SQLite via native `node:sqlite` in WAL mode (`PRAGMA journal_mode = WAL;`)  

---

## 1. Schema Tables

### `projects`
- `id` TEXT PRIMARY KEY
- `root_path` TEXT NOT NULL UNIQUE
- `name` TEXT NOT NULL
- `config_hash` TEXT NOT NULL
- `sync_enabled` INTEGER DEFAULT 0
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### `files`
- `id` TEXT PRIMARY KEY
- `project_id` TEXT NOT NULL (FK -> `projects.id`)
- `relative_path` TEXT NOT NULL
- `content_hash` TEXT NOT NULL (SHA-256)
- `language` TEXT
- `file_size` INTEGER NOT NULL
- `status` TEXT NOT NULL ('valid', 'stale', 'untracked', 'deleted')
- `last_scanned_at` TEXT NOT NULL

### `file_versions`
- `id` TEXT PRIMARY KEY
- `file_id` TEXT NOT NULL (FK -> `files.id`)
- `content_hash` TEXT NOT NULL
- `file_size` INTEGER NOT NULL
- `recorded_at` TEXT NOT NULL

### `analyses`
- `id` TEXT PRIMARY KEY
- `file_id` TEXT NOT NULL (FK -> `files.id`)
- `content_hash` TEXT NOT NULL
- `summary` TEXT NOT NULL
- `ast_metadata` TEXT NOT NULL (JSON)
- `analyzer_version` TEXT NOT NULL
- `schema_version` INTEGER NOT NULL
- `status` TEXT NOT NULL ('valid', 'stale')
- `created_at` TEXT NOT NULL

### `dependencies`
- `id` TEXT PRIMARY KEY
- `project_id` TEXT NOT NULL (FK -> `projects.id`)
- `source_file_id` TEXT NOT NULL (FK -> `files.id`)
- `target_file_id` TEXT (FK -> `files.id`)
- `target_path` TEXT NOT NULL
- `dependency_type` TEXT NOT NULL ('import', 'type_reference', 'config')
- `confidence` REAL DEFAULT 1.0
- `created_at` TEXT NOT NULL

### `decisions`
- `id` TEXT PRIMARY KEY
- `project_id` TEXT NOT NULL (FK -> `projects.id`)
- `session_id` TEXT
- `title` TEXT NOT NULL
- `rationale` TEXT NOT NULL
- `decision` TEXT NOT NULL
- `affected_files` TEXT (JSON array)
- `created_at` TEXT NOT NULL

### `sessions` & `tasks`
- Track agent names, timestamps, summaries, and touched files.

### `schema_migrations`
- `version` INTEGER PRIMARY KEY
- `name` TEXT NOT NULL
- `applied_at` TEXT NOT NULL

