# code-cache — Model Context Protocol (MCP) Server Specification

**Package:** `@code-cache/mcp-server`  
**Protocol Version:** MCP 2024-11-05 (Official TypeScript SDK)  
**Primary Transport:** `stdio` (StdioServerTransport)  
**Secondary Transport:** Streamable HTTP / SSE  

---

## 1. Overview & Capabilities

The code-cache MCP server exposes a high-performance bridge between any MCP-compatible agent (Google Antigravity, Cursor, Claude Code, etc.) and code-cache's SQLite memory store.

---

## 2. Tools Exposed

### `get_project_overview`
Returns high-level project architecture, primary languages, directory breakdown, detected frameworks, and total indexed files.
- **Input:** `{}`
- **Output:** JSON object with project stats and architecture metadata.

### `get_project_status`
Returns cache freshness, pending invalidations, last scan timestamp, and git status.
- **Input:** `{}`
- **Output:** `{ totalFiles: number, unchangedFiles: number, staleFiles: number, lastScannedAt: string }`

### `get_file_analysis`
Returns cached structural analysis, exports, imports, functions, classes, and routes for a relative path.
- **Input:** `{ path: string }`
- **Output:** Structural AST summary, status (`valid` or `stale`), and last analyzed hash.

### `get_file_fingerprint`
Returns the cryptographic fingerprint (SHA-256) of a file to verify whether disk content matches index.
- **Input:** `{ path: string }`
- **Output:** `{ path: string, contentHash: string, matchesDisk: boolean, lastScannedAt: string }`

### `get_changed_files`
Returns all files modified, created, or deleted since the last scan or against Git HEAD.
- **Input:** `{ sinceCommit?: string }`
- **Output:** `{ modified: string[], created: string[], deleted: string[], blastRadius: string[] }`

### `get_dependencies`
Returns upstream (dependencies) and downstream (dependents/blast radius) relationships for a given file.
- **Input:** `{ path: string, direction?: "upstream" | "downstream" | "both" }`
- **Output:** Graph node details with confidence scores.

### `get_task_context`
Primary intelligence tool: accepts a natural language task description and returns relevant files, summaries, dependencies, and previous decisions within a token budget.
- **Input:** `{ query: string, budget?: number }`
- **Output:** Formatted context with provenance metadata and fresh-read instructions.

### `search_project_memory`
Performs deterministic keyword and symbol search across the 5 memory layers.
- **Input:** `{ query: string, limit?: number }`
- **Output:** Ranked memory entries.

### `get_decisions`
Retrieves architectural decision records (ADRs) recorded in previous sessions.
- **Input:** `{ topic?: string }`
- **Output:** Array of ADR objects (`title`, `decision`, `rationale`, `affectedFiles`).

### `record_session`
Allows an agent to record its session summary, files touched, and tasks completed.
- **Input:** `{ agentName: string, summary: string, modifiedFiles: string[], tasksCompleted: string[] }`
- **Output:** `{ sessionId: string, status: "recorded" }`

### `record_decision`
Records a new architectural decision record (ADR) into persistent memory.
- **Input:** `{ title: string, decision: string, rationale: string, affectedFiles?: string[] }`
- **Output:** `{ decisionId: string, status: "saved" }`

### `mark_analysis_stale`
Explicitly flags an analysis as stale, triggering re-analysis on the next cycle.
- **Input:** `{ path: string, reason?: string }`
- **Output:** `{ success: boolean }`

### `refresh_analysis`
Forces immediate re-analysis of a specific file or set of files.
- **Input:** `{ paths: string[] }`
- **Output:** `{ refreshedCount: number }`

---

## 3. Resources Exposed

code-cache exposes standard MCP resources:
- `code-cache://project/overview`: JSON summary of project structure.
- `code-cache://project/status`: Real-time index and memory health.
- `code-cache://project/architecture`: High-level module and framework map.
- `code-cache://project/files`: List of indexed relative paths and statuses.
- `code-cache://project/decisions`: All recorded architectural decisions.
- `code-cache://project/session/latest`: Summary of the most recent agent session.

---

## 4. Error Handling & Validation

Every tool validates input arguments using **Zod schemas**. Any path escaping project boundaries results in an `MCP_ERROR_INVALID_PARAMS` code with message `Path traversal outside project root is forbidden`.

