# @norescan/fingerprint

> Cryptographic SHA-256 content hashing and diff engine for NoReScan codebase caching.

[![npm version](https://img.shields.io/npm/v/@norescan/fingerprint.svg)](https://www.npmjs.com/package/@norescan/fingerprint)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/fingerprint
```

### Usage
```typescript
import { computeFingerprint, diffFingerprints } from '@norescan/fingerprint';

// Hash and fingerprint a file
const fp = await computeFingerprint('/path/to/file.ts', 'src/file.ts');
console.log('SHA-256:', fp.contentHash);

// Diff current fingerprints against previous database snapshots
const diff = diffFingerprints(currentMap, previousMap);
console.log('Added:', diff.added.length);
console.log('Modified:', diff.modified.length);
console.log('Unchanged:', diff.unchanged.length);
```

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
