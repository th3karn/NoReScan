# @norescan/analyzer

> Multi-language AST and lexical structural code parsers (TypeScript, JavaScript, Python, SQL, JSON).

[![npm version](https://img.shields.io/npm/v/@norescan/analyzer.svg)](https://www.npmjs.com/package/@norescan/analyzer)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/analyzer
```

### Usage
```typescript
import { CodeAnalyzer } from '@norescan/analyzer';

const analyzer = new CodeAnalyzer();
const output = await analyzer.analyzeFile('/path/to/server.ts', 'src/server.ts', 'typescript');

console.log('Exports:', output.astMetadata.exports);
console.log('HTTP Routes:', output.astMetadata.routes);
console.log('Summary:', output.summary);
```

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
