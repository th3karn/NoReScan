# @norescan/agent-adapters

> One-click configuration generators and installers for AI coding assistants (Antigravity, Cursor, Claude Code, Codex).

[![npm version](https://img.shields.io/npm/v/@norescan/agent-adapters.svg)](https://www.npmjs.com/package/@norescan/agent-adapters)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/agent-adapters
```

### Usage
```typescript
import { installAdapter, listSupportedAgents } from '@norescan/agent-adapters';

console.log('Supported agents:', listSupportedAgents());

// Install integration for Google Antigravity
await installAdapter('antigravity', process.cwd());

// Install integration for Cursor
await installAdapter('cursor', process.cwd());
```

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
