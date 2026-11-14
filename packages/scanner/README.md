# @norescan/scanner

> High-speed recursive directory traversal engine with ignore rules and secret filtering.

[![npm version](https://img.shields.io/npm/v/@norescan/scanner.svg)](https://www.npmjs.com/package/@norescan/scanner)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/scanner
```

### Usage
```typescript
import { WorkspaceScanner } from '@norescan/scanner';

const scanner = new WorkspaceScanner({
  rootDir: process.cwd(),
  ignorePatterns: ['dist', 'build', '.git']
});
await scanner.init();

const results = await scanner.scan();
console.log('Scanned file count:', results.fingerprints.size);
```

### Security
Hardcoded exclusions protect sensitive credentials before scanning:
- `.env*` files
- `*.pem`, `*.key`, `id_rsa*` keys
- `credentials.json`, secrets manifests

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
