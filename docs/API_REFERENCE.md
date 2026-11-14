# BugBrain — API Reference

---

## 1. Unified CLI Output Contract

When `--json` is supplied, all commands emit a uniform JSON payload to `stdout`:

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

---

## 2. Core Programmatic API (`@bugbrain/core`)

```typescript
import { BugBrainCore } from '@bugbrain/core';

const core = new BugBrainCore(process.cwd());
await core.init('my-project');

// Scan and index
const scanSummary = await core.scan();

// Get status
const status = core.getStatus();

// Retrieve task context
const manifest = core.contextEngine.getContext('Update auth tokens');

// Record architectural decision
core.decisionRepo.recordDecision({
  projectId: core.config.projectId,
  title: 'Adopt JWT Auth',
  decision: 'Use rotating refresh tokens',
  rationale: 'Prevent replay attacks',
  affectedFiles: ['src/auth/jwt.ts'],
});
```

