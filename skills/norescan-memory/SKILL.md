---
name: norescan-memory
description: Persistent codebase-memory layer for AI coding agents. Uses norescan to retrieve verified file analyses, identify modified files, track dependencies, and record technical decisions without redundant full-codebase rescans.
---

# norescan Persistent Memory Protocol

norescan maintains cryptographic SHA-256 fingerprints, AST analyses, module dependencies, and architectural decisions in `.norescan/norescan.db`.

## Before Starting Any Non-Trivial Task

1. **Verify Workspace Memory:**
   Query the norescan MCP server using `get_project_status` or run:
   ```bash
   norescan status
   ```
2. **Retrieve Task-Specific Context:**
   Call `get_task_context` with your task description or run:
   ```bash
   norescan context "<your task description>" --budget 8000
   ```
3. **Inspect Context Freshness:**
   - Files marked `valid` have unmodified source fingerprints. You can safely trust their exports and architectural summaries without re-reading the entire file.
   - Files marked `stale` or `requiresFreshInspection: true` had their hashes or upstream dependencies changed. **You MUST read their current physical source code.**

## Golden Rule of Verification
> [!IMPORTANT]
> **Never assume a cached summary replaces live source inspection before writing modifications.**
> norescan eliminates the 90% of redundant scans on unchanged files. However, before editing a specific file, you MUST always read the actual file from disk to ensure precision.

## After Completing Work

1. **Refresh Index & Blast Radius:**
   Run an incremental scan to index your changes and update the dependency graph:
   ```bash
   norescan scan
   ```
2. **Document Architectural Decisions (ADRs):**
   If you introduced a new pattern, library, database column, or route, record it:
   ```bash
   norescan decisions add --title "<Decision Title>" --decision "<What was decided>" --rationale "<Why>"
   ```
   Or call the MCP tool `record_decision`.
3. **Log Session Accomplishments:**
   Call `record_session` with a concise summary of touched files and fixed issues.
