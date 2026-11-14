# code-cache — API & Contract Specification

**Organization:** LostGit Solutions  
**Version:** 1.0.0-draft  

---

## 1. Unified CLI Output Contract

Every CLI command producing JSON (`--json` flag) adheres to a uniform structure sent to `stdout`. All diagnostic logs, warnings, or debug traces are routed to `stderr` to ensure stdout can be piped directly into `jq` or agent consumers.

### Schema:
```typescript
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
```

### Example: `code-cache status --json`
```json
{
  "success": true,
  "command": "status",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-11-14T10:45:00.000Z",
  "data": {
    "totalFiles": 1420,
    "validAnalyses": 1395,
    "staleAnalyses": 25,
    "untrackedFiles": 0,
    "lastScannedAt": "2026-11-14T10:30:00.000Z",
    "gitHead": "a1b2c3d4",
    "sessionsCount": 14,
    "decisionsCount": 8
  }
}
```

---

## 2. Model Context Protocol (MCP) Tool Schemas

All MCP tools validate arguments using Zod.

### Tool: `get_task_context`
- **Schema:**
  ```typescript
  export const GetTaskContextArgsSchema = z.object({
    query: z.string().min(1).describe("Natural language description of the coding task"),
    budget: z.number().int().positive().optional().default(8000).describe("Token budget limit"),
    format: z.enum(["markdown", "json"]).optional().default("markdown")
  });
  ```
- **Response Format:**
  Returns content of type `text`, formatted either as Markdown or JSON string according to `format`.

### Tool: `record_decision`
- **Schema:**
  ```typescript
  export const RecordDecisionArgsSchema = z.object({
    title: z.string().min(3).describe("Title of the architectural decision"),
    decision: z.string().min(10).describe("What was decided"),
    rationale: z.string().min(10).describe("Why this decision was made"),
    affectedFiles: z.array(z.string()).optional().describe("Files modified or influenced")
  });
  ```

---

## 3. Optional Cloud Sync API Endpoints (Phase 10)

Base URL: `https://api.code-cache.dev/v1` (Optional hosted / self-hosted Fastify instance).

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/projects` | Register a cloud project sync namespace | Bearer Token |
| `POST` | `/v1/sync/push` | Push encrypted memory payload & checkpoints | Bearer Token |
| `POST` | `/v1/sync/pull` | Pull newer memory payloads since cursor | Bearer Token |
| `DELETE` | `/v1/projects/:id`| Hard delete project memory from cloud | Bearer Token |

All cloud payloads are client-side encrypted using **AES-256-GCM** with a developer-held key derived from PBKDF2. The cloud backend never stores plaintext summaries or raw source code.

