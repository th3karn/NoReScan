# @norescan/shared

> Shared domain types, schemas, error hierarchy, and path security utilities for NoReScan.

[![npm version](https://img.shields.io/npm/v/@norescan/shared.svg)](https://www.npmjs.com/package/@norescan/shared)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/shared
```

### Exports
- **Domain Interfaces**: `AstMetadata`, `FileFingerprint`, `SymbolDefinition`, `DependencyEdge`, `NoReScanConfig`.
- **Validation Schemas**: Zod validation schemas for all config records and inputs.
- **Path Security**: `normalizePath`, `isSafePath` ensuring zero directory traversal escapes.
- **Typed Errors**: Hierarchy rooted in `NoReScanError`.

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
