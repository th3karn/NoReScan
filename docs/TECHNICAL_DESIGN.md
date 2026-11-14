# norescan — Technical Design Document (TDD)

**System:** norescan Core Infrastructure  
**Author:** LostGit Solutions Engineering Team  
**Repository:** [https://github.com/th3karn/norescan](https://github.com/th3karn/norescan)  

---

## 1. Core Technical Components

### 1.1 SHA-256 Cryptographic Fingerprints
- Content identity is established by computing a SHA-256 hash across raw file contents.
- Line endings are automatically normalized (CRLF -> LF) to ensure deterministic hashes across Windows, macOS, and Linux checkouts.

### 1.2 Five-Layer Memory Engine (SQLite)
Memory is partitioned across 5 distinct logical layers:
1. **File Memory:** SHA-256 hash, mtime, language, size, last scanned timestamp.
2. **Architecture Memory:** Extracted exports, imports, functions, classes, routes, models, schemas.
3. **Dependency Memory:** Inter-module directed graph edges with confidence scores.
4. **Decision Memory:** Architectural Decision Records (ADRs) with rationale and affected files.
5. **Session Memory:** Agent interaction logs, prompt summaries, and modified files.

### 1.3 Conservative Invalidation Algorithm
```typescript
if (file.hashChanged) {
  const newAnalysis = parseAst(file);
  const oldAnalysis = getStoredAnalysis(file);
  
  if (haveExportsChanged(oldAnalysis.exports, newAnalysis.exports)) {
    // Public interface changed -> invalidate direct dependents in blast radius
    invalidateDependents(file);
  } else {
    // Internal implementation only -> preserve dependent caches
    preserveDependents(file);
  }
}
```

### 1.4 Safe Legacy Migration Engine
When initializing or running commands in a repository with `.repomind/`:
1. Check if `.norescan/` already exists. If both exist, keep `.norescan/` as primary.
2. If `.norescan/` does not exist:
   - Create a safe timestamped backup archive of `.repomind/`.
   - Copy `config.json` (updating internal `repoMind` references to `norescan`).
   - Copy `memory.db` to `.norescan/norescan.db`.
   - Record migration event in database.
   - Leave legacy `.repomind/` intact (never silently delete).

