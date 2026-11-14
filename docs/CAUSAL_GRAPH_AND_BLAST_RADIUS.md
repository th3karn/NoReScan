# CAUSAL DEPENDENCY GRAPH & BLAST RADIUS CARTOGRAPHER
## Architecture Section 4 & Visual Intelligence

code-cache includes **The Cartographer**, a specialized graph intelligence engine that models every file, module, and import dependency as a directed causal graph.

---

## 1. Core Graph Metrics

- **In-Degree (Dependents Count):** The number of other files in the codebase that import a given file. Files with high in-degree are designated as **Hot Files** (architectural load-bearers).
- **Out-Degree (Dependencies Count):** The number of files imported by a given file.
- **Graph Density:** Ratio of actual edges to maximum possible edges, measuring codebase coupling.
- **Cycle Detection:** DFS-based topological cycle detector that flags circular import dependencies (`A -> B -> C -> A`).

---

## 2. Blast a Diff — Upstream Dependency Cone

When an AI coding agent or engineer edits a file, code-cache calculates the **Blast Cone**—the transitive closure of upstream files that could experience breakage or runtime regression.

### Diff Parsing Algorithm
code-cache parses raw `git diff` outputs across git and unified diff formats:
- `diff --git a/path/to/file.ts b/path/to/file.ts`
- `+++ b/path/to/file.ts`
- `--- a/path/to/file.ts`

### Upstream Traversal
Using a breadth-first search (BFS) starting from the changed seed files, code-cache maps every upstream dependent up to `maxDepth` (default: 10), categorizing dependents by depth level:
- **Level 1:** Direct consumers of the changed file (immediate risk).
- **Level 2:** Indirect consumers that rely on Level 1 modules.
- **Level 3+:** Distant system consumers.

---

## 3. Interactive Web Dashboard UI

Running `code-cache serve` starts an HTTP server serving the interactive Cartographer dashboard UI:
- **Hot Files Panel:** Click any hot file to see its dependents highlighted.
- **Diff Input Box:** Paste output from `git diff` or `git diff HEAD~1` and click **"💥 Blast Diff"**.
- **Interactive Force-Directed Canvas:**
  - **Cyan nodes:** Hot load-bearing files.
  - **Green nodes:** Modified seed files from the diff.
  - **Orange nodes:** Affected upstream blast cone files.
  - **Slate nodes:** Normal project files.

---

## 4. CLI & Programmatic Interfaces

```bash
# Export causal graph in mermaid flowchart format
code-cache graph --format mermaid

# Export causal graph in Graphviz DOT format
code-cache graph --format dot

# Inspect hot files with highest in-degree
code-cache hot-files --limit 15

# Blast a specific file or a git diff string
code-cache blast src/auth/service.ts
code-cache blast "$(git diff HEAD~1)"

# Start REST API and interactive Web UI
code-cache serve --port 31415
```

