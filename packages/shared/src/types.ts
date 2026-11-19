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

// -------------------------------------------------------------
// Cloud Identity, Entitlements & Device Types (Phase 2)
// -------------------------------------------------------------

export type PlanTier = 'community' | 'pro' | 'team' | 'enterprise';

export interface PlanEntitlements {
  plan: PlanTier;
  features: {
    cloudSync: boolean;
    cloudBackup: boolean;
    teamMemory: boolean;
    teamAnalytics: boolean;
    auditLogs: boolean;
    sso: boolean;
    selfHosted: boolean;
  };
  limits: {
    devices: number;
    cloudStorageGb: number;
    syncedProjects: number;
    seats?: number;
  };
  expiresAt?: string;
  signature?: string;
}

export interface UserAccount {
  userId: string;
  email: string;
  name?: string;
  token: string;
  refreshToken?: string;
  deviceId: string;
  deviceName: string;
  plan: PlanTier;
  entitlements?: PlanEntitlements;
  lastLoginAt: string;
}

export interface UserCredentialsFile {
  version: 1;
  activeAccount?: string;
  accounts: Record<string, UserAccount>;
}

export interface DeviceRegistration {
  deviceId: string;
  name: string;
  platform: string;
  lastSeenAt: string;
  revokedAt?: string;
}

// -------------------------------------------------------------
// Phase 3: Encrypted Sync & Backup Types
// -------------------------------------------------------------

export interface EncryptedPayload {
  version: 1;
  algorithm: 'aes-256-gcm';
  iv: string; // hex
  authTag: string; // hex
  ciphertext: string; // base64
  salt: string; // hex
  createdAt: string;
}

export interface BackupArchive {
  projectId: string;
  projectName: string;
  createdAt: string;
  encryptedData: EncryptedPayload;
  metadata: {
    filesCount: number;
    decisionsCount: number;
    edgesCount: number;
  };
}

// -------------------------------------------------------------
// Phase 4: Billing & Provider Abstraction Types
// -------------------------------------------------------------

export type BillingProviderName = 'razorpay' | 'paddle' | 'stripe';

export type SubscriptionStatus =
  | 'pending'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'canceled'
  | 'expired';

export interface CheckoutSession {
  id: string;
  url: string;
  provider: BillingProviderName;
  plan: PlanTier;
  amountMinor: number;
  currency: 'INR' | 'USD';
  expiresAt: string;
}

export interface VerifiedWebhookEvent {
  id: string;
  provider: BillingProviderName;
  eventType: string;
  subscriptionId?: string;
  status?: SubscriptionStatus;
  customerId?: string;
  payload: Record<string, unknown>;
}

// -------------------------------------------------------------
// Phase 5: Team & Agency Workspace Collaboration Types
// -------------------------------------------------------------

export type OrgRole = 'owner' | 'admin' | 'member' | 'read_only';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: PlanTier;
  seatsAllocated: number;
  createdAt: string;
}

export interface OrganizationMember {
  orgId: string;
  userId: string;
  email: string;
  role: OrgRole;
  status: 'active' | 'invited' | 'suspended';
  joinedAt: string;
}

// -------------------------------------------------------------
// Phase 6: Enterprise Audit & Marketplace Extension Types
// -------------------------------------------------------------

export interface AuditEvent {
  id: string;
  orgId: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  hash: string;
}

export interface ExtensionManifest {
  name: string;
  version: string;
  description: string;
  type: 'analyzer' | 'adapter' | 'context_strategy';
  author: string;
  license: string;
  entrypoint?: string;
}
