# @norescan/context-engine

> Task-relevant context ranking and token budgeting engine for AI coding assistants.

[![npm version](https://img.shields.io/npm/v/@norescan/context-engine.svg)](https://www.npmjs.com/package/@norescan/context-engine)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/context-engine
```

### Usage
```typescript
import { ContextEngine } from '@norescan/context-engine';

const engine = new ContextEngine(db, projectRoot);
const manifest = engine.getContext('Fix Stripe payment webhook verification', {
  maxTokens: 8000
});

console.log('Ranked relevant files:', manifest.files);
const promptMarkdown = engine.getContextMarkdown('Fix Stripe payment webhook verification');
```

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
