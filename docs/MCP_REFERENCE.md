# BugBrain — Model Context Protocol (MCP) Reference

**Server Name:** `bugbrain`  
**URI Namespace:** `bugbrain://`  
**Transport:** `stdio` (StdioServerTransport)  

---

## 1. Exposed Tools

1. `get_project_overview`: High-level architecture, primary languages, directory overview, stats.
2. `get_project_status`: Real-time index status, total files, valid vs stale cached analyses.
3. `get_file_analysis`: Cached structural AST analysis, exports, imports, routes for relative path.
4. `get_file_fingerprint`: Verify file cryptographic SHA-256 fingerprint against stored snapshot.
5. `get_changed_files`: Retrieve modified, created, and deleted files since last scan.
6. `get_dependencies`: Upstream (imported) and downstream (dependents) relationships.
7. `get_task_context`: Context manifest ranked for task query within token budget.
8. `search_project_memory`: Keyword and symbol search across stored memory layers.
9. `get_decisions`: Retrieve historical architectural decisions (ADRs).
10. `record_decision`: Save a new architectural decision (ADR) into persistent memory.
11. `record_session`: Record agent turn summaries and modified files.
12. `mark_analysis_stale`: Explicitly invalidate cached file analysis.
13. `refresh_analysis`: Force immediate re-analysis of specified files.
14. `get_context_manifest`: Retrieve complete context manifest with provenance metadata.

---

## 2. Exposed Resources

- `bugbrain://project/overview`
- `bugbrain://project/status`
- `bugbrain://project/architecture`
- `bugbrain://project/files`
- `bugbrain://project/decisions`
- `bugbrain://session/latest`
