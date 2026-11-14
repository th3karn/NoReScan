# @norescan/dependency-graph

> Directed module dependency graph, cycle detection, and blast-radius calculator for NoReScan.

[![npm version](https://img.shields.io/npm/v/@norescan/dependency-graph.svg)](https://www.npmjs.com/package/@norescan/dependency-graph)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/dependency-graph
```

### Usage
```typescript
import { DependencyGraph, InvalidationEngine } from '@norescan/dependency-graph';

const graph = new DependencyGraph();
graph.addEdge('src/auth.ts', 'src/db.ts');

// Calculate upstream blast radius
const blast = graph.getTransitiveUpstream('src/db.ts');
console.log('Affected callers:', blast);

// Check circular references
const cycles = graph.detectCycles();
```

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
