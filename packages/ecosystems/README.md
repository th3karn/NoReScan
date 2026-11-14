# @norescan/ecosystems

> Universal polyglot runtime and toolchain intelligence across Node, Python, Rust, Go, Java, Docker.

[![npm version](https://img.shields.io/npm/v/@norescan/ecosystems.svg)](https://www.npmjs.com/package/@norescan/ecosystems)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/ecosystems
```

### Usage
```typescript
import { EcosystemRegistry, EnvironmentProbe } from '@norescan/ecosystems';

const registry = new EcosystemRegistry();
const detected = await registry.discoverActive(process.cwd());
console.log('Active ecosystems:', detected.map(e => e.id));

const probe = new EnvironmentProbe();
const envSummary = await probe.probeAll();
console.log('Installed runtime tools:', envSummary);
```

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
