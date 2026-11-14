# @norescan/core

> Central coordinator orchestrating all NoReScan persistent memory subsystems.

[![npm version](https://img.shields.io/npm/v/@norescan/core.svg)](https://www.npmjs.com/package/@norescan/core)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/core
```

### Programmatic Usage
```typescript
import { NoReScanCore } from '@norescan/core';

const core = new NoReScanCore(process.cwd());
await core.init('my-project');

// Fast incremental scan
const scanResult = await core.scan();
console.log('Indexed files:', scanResult.totalIndexed);

// Real-time memory indexing (<5ms)
const mem = await core.rememberFile('src/auth.ts');
console.log('Saved AST symbols:', mem.symbolsCount);

// Retrieve task context
const context = core.contextEngine.getContext('Refactor auth logic');
console.log('Relevant files:', context.files.map(f => f.relativePath));
```

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
