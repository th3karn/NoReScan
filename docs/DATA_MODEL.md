# BugBrain — Domain Data Model & Entity Specifications

**Organization:** LostGit Solutions  
**Status:** Living Domain Specification  

---

## 1. Domain Entities & Type Definitions

### 1.1 Project (`Project`)
Represents a registered codebase workspace.
```typescript
export interface Project {
  id: string; // UUID v4
  rootPath: string; // Absolute path normalized with forward slashes
  name: string; // Directory name or package name
  configHash: string; // SHA-256 of .BugBrain/config.json
  syncEnabled: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### 1.2 File Snapshot (`FileSnapshot`)
Represents an indexed file in the repository.
```typescript
export type FileAnalysisStatus = 'valid' | 'stale' | 'untracked' | 'deleted' | 'needs_reanalysis';

export interface FileSnapshot {
  id: string; // UUID v4
  projectId: string;
  relativePath: string; // e.g. "src/auth/service.ts" (normalized '/')
  contentHash: string; // SHA-256 hex string (64 characters)
  language: string; // e.g. "typescript", "python", "go"
  fileSize: number; // Bytes
  status: FileAnalysisStatus;
  lastScannedAt: string; // ISO 8601
}
```

### 1.3 Analysis Record (`FileAnalysis`)
Detailed structural AST analysis cached for a specific file snapshot.
```typescript
export interface SymbolDefinition {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'component' | 'method';
  line: number;
  signature?: string;
  exported: boolean;
}

export interface ImportDefinition {
  source: string; // e.g. "./utils" or "express"
  specifiers: string[]; // e.g. ["Router", "Request"]
  isDynamic: boolean;
  isTypeOnly: boolean;
}

export interface ExportDefinition {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'default';
  signature?: string;
}

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  path: string;
  handler: string;
}

export interface ModelDefinition {
  name: string;
  fields: Array<{ name: string; type: string; isOptional?: boolean }>;
}

export interface AstMetadata {
  symbols: SymbolDefinition[];
  imports: ImportDefinition[];
  exports: ExportDefinition[];
  routes?: RouteDefinition[];
  models?: ModelDefinition[];
}

export interface FileAnalysis {
  id: string;
  fileId: string;
  contentHash: string;
  summary: string;
  astMetadata: AstMetadata;
  analyzerVersion: string; // e.g. "1.0.0"
  schemaVersion: number; // e.g. 1
  status: 'valid' | 'stale';
  createdAt: string;
}
```

### 1.4 Dependency Edge (`DependencyEdge`)
Directed graph connection between modules.
```typescript
export type DependencyType = 'import' | 'type_reference' | 'config' | 'dynamic_import';

export interface DependencyEdge {
  id: string;
  projectId: string;
  sourceFileId: string;
  targetFileId?: string; // Resolved file ID, if target is an internal project file
  targetPath: string; // Import specifier string
  dependencyType: DependencyType;
  confidence: number; // 0.0 to 1.0 (default 1.0 for direct imports)
  createdAt: string;
}
```

### 1.5 Agent Session (`AgentSession`)
```typescript
export interface AgentSession {
  id: string;
  projectId: string;
  agentName: string; // 'antigravity', 'cursor', 'claude-code', 'cli', etc.
  startedAt: string;
  endedAt?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}
```

### 1.6 Architectural Decision Record (`DecisionRecord`)
```typescript
export interface DecisionRecord {
  id: string;
  projectId: string;
  sessionId?: string;
  title: string;
  rationale: string;
  decision: string;
  affectedFiles: string[]; // Normalized relative paths
  createdAt: string;
}
```

### 1.7 Task Context Manifest (`TaskContextManifest`)
The structured output returned to agents:
```typescript
export interface TaskContextManifest {
  projectId: string;
  query: string;
  generatedAt: string;
  totalTokensEstimated: number;
  files: Array<{
    relativePath: string;
    contentHash: string;
    language: string;
    status: FileAnalysisStatus;
    summary: string;
    relevanceScore: number;
    exports: ExportDefinition[];
    dependencies: string[];
    requiresFreshInspection: boolean;
  }>;
  decisions: DecisionRecord[];
  warnings: string[];
  instructions: string;
}
```

---

## 2. Status Lifecycles

### 2.1 File Status Lifecycle
```
[ Untracked ] ──► (Discovered during scan) ──► [ Valid ]
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        │ (SHA-256 mismatch)                              │ (File deleted)
                        ▼                                                 ▼
                    [ Stale ]                                        [ Deleted ]
                        │
                        ▼ (Re-analyzed)
                    [ Valid ]
```

### 2.2 Analysis Status Lifecycle
- An analysis record is marked `valid` upon generation.
- It transitions to `stale` if:
  1. The file's content hash changes.
  2. The analyzer version increments.
  3. The schema version increments.
  4. An upstream dependency's public exports change (conservative invalidation).

