# HYBRID MEMORY & SYNCHRONIZATION ARCHITECTURE
## Architecture Section 11 — Specification & Implementation

BugBrain implements a **Local-First, Cloud-Optional** hybrid memory model. Local memory on the developer's machine is the single primary source of truth for the active repository. Cloud memory is an optional synchronization layer for sharing architectural intelligence across authorized devices and team members.

---

## 1. Synchronization Topology

```
┌────────────────────────────────────────────────────────┐
│                   Developer Machine                    │
│   - Project Files (on physical disk)                   │
│   - SQLite Database (`.bugbrain/bugbrain.db`)           │
│   - Offline Sync Queue (`sync_offline_queue`)          │
│   - Sync Cursors (`sync_cursors`)                      │
└───────────────────────────┬────────────────────────────┘
                            │ Opt-in Sync (HTTPS / TLS)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   BugBrain Cloud                       │
│   - Authentication & Device Authorization              │
│   - PostgreSQL Storage Engine                          │
│   - Encrypted Architectural Memory Records             │
│   - Zero Source Code Storage Guarantee                 │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Other Authorized Devices                 │
│   - Restores project architectural knowledge           │
│   - Synchronizes ADRs, tags, and graph edges           │
└────────────────────────────────────────────────────────┘
```

---

## 2. Core Synchronization Rules

| Rule | Implementation Guarantee |
| :--- | :--- |
| **Local Independence** | Local operation **never** depends on cloud availability. BugBrain operates at 100% capacity in air-gapped or offline environments. |
| **Stable Identifiers** | All entities (projects, files, ADRs, queue items) utilize cryptographically secure UUIDv4 identifiers. |
| **Cursor Tracking** | Each device tracks a logical timestamp and revision counter in `sync_cursors`. |
| **Offline Change Queue** | Local mutations offline are stored in `sync_offline_queue` with status `PENDING`. |
| **Conflict Detection** | Concurrent updates from distinct device IDs are detected and flagged rather than silently overwritten. |
| **Deterministic Merge** | Last-Write-Wins (LWW) based on verified UTC timestamps for metadata; append-only union for Architectural Decision Records (ADRs). |
| **Privacy Guarantee** | **Source code is strictly excluded from cloud synchronization by default.** Only relative paths, SHA-256 hashes, language tags, dependency edges, and ADRs are transmitted. |

---

## 3. Database Schema Migration v3

The hybrid sync subsystem is backed by two dedicated tables introduced in migration `003_hybrid_sync_and_queue`:

### `sync_cursors` Table
Tracks synchronization progress and device metadata:
```sql
CREATE TABLE sync_cursors (
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
```

### `sync_offline_queue` Table
Queues offline operations until remote synchronization can occur:
```sql
CREATE TABLE sync_offline_queue (
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
```

---

## 4. CLI Usage

```bash
# Check hybrid synchronization status and device ID
bugbrain sync status

# Generate sanitized push payload (source code stripped by policy)
bugbrain sync push
```

