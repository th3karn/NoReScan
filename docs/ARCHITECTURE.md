# RepoMind — System Architecture & Component Specification

**Organization:** LostGit Solutions  
**Status:** Living Architecture Document  

---

## 1. Architectural Layers & Boundaries

RepoMind enforces clean separation between 5 primary layers:

```
+-------------------------------------------------------------+
| Layer 5: Interfaces & Transports                            |
| CLI (Commander) | MCP Server (stdio/HTTP) | Agent Adapters  |
+-------------------------------------------------------------+
| Layer 4: Intelligence & Context Processing                  |
| Context Engine | Ranking & Budgeting | Agent Skill Bridge   |
+-------------------------------------------------------------+
| Layer 3: Code Intelligence & Graph                          |
| AST Analyzers | Dependency Graph | Conservative Invalidator|
+-------------------------------------------------------------+
| Layer 2: Core Domain & Memory Coordination                 |
| Project Registry | Scanner | Fingerprinter | 5-Layer Memory|
+-------------------------------------------------------------+
| Layer 1: Data Persistence & System I/O                      |
| SQLite (better-sqlite3) | File System / Git | Crypto Engine |
+-------------------------------------------------------------+
```

---

## 2. Core Subsystems

### 2.1 Project Registry (`@repomind/core`)
- Discovers the nearest `.git` or project root.
- Initializes and maintains `.repomind/config.json`.
- Manages unique project UUIDs and config hashing.

### 2.2 File Scanner (`@repomind/scanner`)
- Uses fast globbing with negative patterns.
- Parses `.gitignore` and `.repomindignore`.
- Enforces max file size limits (default: 2MB per file) and skips binary files.
- Checks symlink targets to avoid directory traversal outside project boundaries.

### 2.3 Fingerprint Engine (`@repomind/fingerprint`)
- Generates deterministic SHA-256 hashes of raw file buffers.
- Normalizes line endings (LF vs CRLF) where necessary for cross-platform stability.
- Compares current state against stored fingerprints to return:
  - `UNCHANGED`: Fingerprint and versions match.
  - `MODIFIED`: Content hash differs.
  - `NEW`: Path absent from previous index.
  - `DELETED`: Previously indexed path no longer exists on disk.
  - `RENAMED`: Matching content hash with altered path.

### 2.4 Code Analyzer Engine (`@repomind/analyzer`)
- Modular language analyzers:
  - **TypeScript / JavaScript:** Imports, exports, classes, interfaces, function signatures, Express/Fastify/Next.js routes.
  - **Python:** Imports, classes, defs, decorators, FastAPI/Flask routes, Pydantic models.
  - **Go, Rust, Java, C/C++:** Structural symbol extraction.
  - **JSON / YAML / SQL:** Schema definitions, table migrations, configuration blocks.
- Produces standardized AST metadata:
  ```typescript
  interface FileAnalysisResult {
    summary: string;
    exports: Array<{ name: string; kind: 'function' | 'class' | 'type' | 'variable'; signature?: string }>;
    imports: Array<{ source: string; specifiers: string[]; isDynamic?: boolean }>;
    symbols: Array<{ name: string; kind: string; line: number }>;
    routes?: Array<{ method: string; path: string; handler: string }>;
    models?: Array<{ name: string; fields: string[] }>;
  }
  ```

### 2.5 Dependency Graph Engine (`@repomind/dependency-graph`)
- Maintains an in-memory directed graph of project files and relationships.
- Edge types:
  - `IMPORT`: Direct module import (`import { x } from './y'`).
  - `TYPE_REFERENCE`: Type or interface reference.
  - `CONFIG_REFERENCE`: Config file impacting consumer.
- Computes **Blast Radius**:
  When a file `F` is modified, computes the upstream reachable set (dependents).
  If `F` changed only private implementation (internal AST bodies unchanged in exported signatures), dependents are flagged `POTENTIALLY_AFFECTED` rather than invalidated. If public exports change, dependents are queued for re-analysis.

### 2.6 Five-Layer Memory Coordinator (`@repomind/memory`)
RepoMind coordinates 5 memory layers in SQLite:
1. **File Memory:** Fingerprints, languages, file sizes, structural summaries.
2. **Architecture Memory:** High-level subsystems, entry points, detected frameworks, route maps.
3. **Session Memory:** Agent interactions, tasks attempted, files touched, outcome summaries.
4. **Decision Memory:** Explicit technical and architectural decisions (ADRs) recorded by agents.
5. **Dependency Memory:** Inter-file and inter-symbol relationships with confidence scores.

### 2.7 Context Engine (`@repomind/context-engine`)
- Accepts natural language task queries: e.g. `"Fix authentication cookie expiration bug"`.
- Runs semantic token extraction and keyword matching across:
  - File paths and filenames.
  - Exported symbols, function names, and interfaces.
  - Structural summaries and documented decisions.
  - Graph traversal from seed matches to adjacent dependencies.
- Ranks candidates using a weighted scoring model.
- Packs the output into Markdown or JSON, strictly bounded by the user's `--budget` (in tokens or bytes).

