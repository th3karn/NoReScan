# @norescan/fixer

> Autonomous test runner diagnostics, blast-radius error tracer, and auto-healing bug fixer for NoReScan.

[![npm version](https://img.shields.io/npm/v/@norescan/fixer.svg)](https://www.npmjs.com/package/@norescan/fixer)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/fixer
```

### Features
- **Polyglot Test Detection**: Auto-detects Vitest, Jest, Pytest, Cargo, and Go tests.
- **Compiler & Traceback Parsing**: Extracts file locations, error codes (e.g. `TS2307`, `TS2339`), and message stack traces.
- **Blast Radius Tracing**: Uses NoReScan's dependency graph to localize root-cause files.
- **Automated Fix Generation**: Proposes and writes verified patches to disk.

### Usage
```typescript
import { FixerEngine } from '@norescan/fixer';
import { NoReScanCore } from '@norescan/core';

const core = new NoReScanCore(process.cwd());
await core.init('my-project');

const fixer = new FixerEngine(process.cwd(), core);
const fixResult = await fixer.diagnoseAndFix({
  command: 'pnpm test',
  autoApply: true
});

console.log('Fixed errors:', fixResult.appliedCount);
```

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
