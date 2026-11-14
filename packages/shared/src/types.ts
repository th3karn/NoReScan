export type FileAnalysisStatus = 'valid' | 'stale' | 'untracked' | 'deleted' | 'needs_reanalysis';

export interface Project {
  id: string;
  rootPath: string;
  name: string;
  configHash: string;
  syncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileSnapshot {
  id: string;
  projectId: string;
  relativePath: string;
  contentHash: string;
  language: string;
  fileSize: number;
  status: FileAnalysisStatus;
  lastScannedAt: string;
}

export interface SymbolDefinition {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'component' | 'method' | 'property' | 'table';
  line: number;
  signature?: string;
  exported: boolean;
}

export interface ImportDefinition {
  source: string;
  specifiers: string[];
  isDynamic?: boolean;
  isTypeOnly?: boolean;
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
  analyzerVersion: string;
  schemaVersion: number;
  status: 'valid' | 'stale';
  createdAt: string;
}

export type DependencyType = 'import' | 'type_reference' | 'config' | 'dynamic_import';

export interface DependencyEdge {
  id: string;
  projectId: string;
  sourceFileId: string;
  targetFileId?: string;
  targetPath: string;
  dependencyType: DependencyType;
  confidence: number;
  createdAt: string;
}

export interface AgentSession {
  id: string;
  projectId: string;
  agentName: string;
  startedAt: string;
  endedAt?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskRecord {
  id: string;
  projectId: string;
  sessionId?: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface DecisionRecord {
  id: string;
  projectId: string;
  sessionId?: string;
  title: string;
  rationale: string;
  decision: string;
  affectedFiles: string[];
  createdAt: string;
}

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

export interface CliResponse<T = unknown> {
  success: boolean;
  command: string;
  projectId?: string;
  timestamp: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    recoverable: boolean;
  };
}
