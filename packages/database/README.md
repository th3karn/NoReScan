# @norescan/database

> Native SQLite persistence layer (node:sqlite) in WAL mode for NoReScan memory.

[![npm version](https://img.shields.io/npm/v/@norescan/database.svg)](https://www.npmjs.com/package/@norescan/database)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/database
```

### Usage
```typescript
import { NoReScanDatabase } from '@norescan/database';

const db = new NoReScanDatabase('/path/to/.norescan/norescan.db');
db.init();

// Access strongly typed repositories
const file = db.files.getByPath('project-1', 'src/index.ts');
const latestAnalysis = db.analyses.getLatestByFileId(file.id);
```

### Features
- Native Node.js SQLite bindings (`node:sqlite`) with zero C++ compilation dependencies.
- Synchronous Write-Ahead Logging (WAL) for high concurrency.
- Atomic schema migrations system.

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
