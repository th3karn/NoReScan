export const INITIAL_MIGRATION_V1 = `
-- Migration 001: Initial norescan Schema

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  language TEXT,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL,
  last_scanned_at TEXT NOT NULL,
  UNIQUE(project_id, relative_path),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_files_project_path ON files(project_id, relative_path);
CREATE INDEX IF NOT EXISTS idx_files_content_hash ON files(content_hash);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);

CREATE TABLE IF NOT EXISTS file_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  summary TEXT NOT NULL,
  ast_metadata TEXT NOT NULL,
  analyzer_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_analyses_file_hash ON analyses(file_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);

CREATE TABLE IF NOT EXISTS dependencies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_file_id TEXT NOT NULL,
  target_file_id TEXT,
  target_path TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(source_file_id) REFERENCES files(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_file_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_file_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  summary TEXT,
  metadata TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id, started_at);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  session_id TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);

CREATE TABLE IF NOT EXISTS task_files (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  action TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_files_task ON task_files(task_id);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  session_id TEXT,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  decision TEXT NOT NULL,
  affected_files TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id, created_at);

CREATE TABLE IF NOT EXISTS memory_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_memory_events_time ON memory_events(project_id, occurred_at);
`;

export const MIGRATION_V2_ECOSYSTEMS = `
-- Migration 002: Polyglot Ecosystems, Package Dependencies, Commands, and Workspaces

CREATE TABLE IF NOT EXISTS ecosystem_manifests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  ecosystem_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  parsed_metadata TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_eco_manifests_proj ON ecosystem_manifests(project_id, ecosystem_id);

CREATE TABLE IF NOT EXISTS package_dependencies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  manifest_id TEXT NOT NULL,
  name TEXT NOT NULL,
  declared_version TEXT NOT NULL,
  resolved_version TEXT,
  dependency_type TEXT NOT NULL,
  registry TEXT,
  is_direct INTEGER DEFAULT 1,
  is_optional INTEGER DEFAULT 0,
  platform_condition TEXT,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pkg_deps_name ON package_dependencies(project_id, name);

CREATE TABLE IF NOT EXISTS project_commands (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  raw_command TEXT NOT NULL,
  category TEXT NOT NULL,
  source_file TEXT NOT NULL,
  working_dir TEXT NOT NULL,
  description TEXT,
  safe_to_run INTEGER DEFAULT 1,
  requires_network INTEGER DEFAULT 0,
  ecosystem_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_proj_cmds_cat ON project_commands(project_id, category);

CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  ecosystem_id TEXT NOT NULL,
  manifest_path TEXT NOT NULL,
  dependencies TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ws_members_proj ON workspace_members(project_id);
`;

export const MIGRATION_V3_HYBRID_SYNC = `
-- Hybrid Memory and Synchronization Schema (Architecture Section 11)
CREATE TABLE IF NOT EXISTS sync_cursors (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  last_synced_at TEXT NOT NULL,
  sync_cursor TEXT NOT NULL,
  sync_version INTEGER DEFAULT 1,
  status TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sync_cursors_proj ON sync_cursors(project_id, device_id);

CREATE TABLE IF NOT EXISTS sync_offline_queue (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  attempt_count INTEGER DEFAULT 0,
  error_message TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_offline_queue(project_id, status);
`;


