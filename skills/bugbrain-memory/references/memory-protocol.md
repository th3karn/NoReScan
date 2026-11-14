# Memory Protocol Specification

## 1. Five Memory Layers

| Layer | Responsibility | Storage Table |
| :--- | :--- | :--- |
| **File Memory** | Content fingerprints, language, size, scan timestamps | `files`, `file_versions` |
| **Architecture Memory** | Extracted exports, imports, routes, schemas | `analyses` |
| **Dependency Memory** | Directed graph of module imports and blast radius | `dependencies` |
| **Decision Memory** | Architectural Decision Records (ADRs) | `decisions` |
| **Session Memory** | Agent interaction logs and modified file history | `sessions`, `tasks` |

## 2. Invalidation Mechanics

- Modification of file `F` triggers re-hashing and AST re-parsing.
- If `F`'s exported interface (exported symbols, function signatures, types) changed, all immediate dependents in the directed graph are flagged `stale`.
- If only private internal implementation changed, dependents remain `valid`.

