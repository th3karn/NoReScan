# @norescan/cli

> Developer CLI binary for NoReScan: persistent codebase memory infrastructure for AI coding agents.

[![npm version](https://img.shields.io/npm/v/@norescan/cli.svg)](https://www.npmjs.com/package/@norescan/cli)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install -g @norescan/cli
# or run directly with npx
npx @norescan/cli --help
```

### Common Commands
```bash
# Initialize NoReScan in current project
norescan init

# Scan and index codebase
norescan scan

# Real-time memory indexing (<5ms)
norescan remember src/index.ts

# Retrieve context for a coding task within token budget
norescan context "Implement JWT authentication" --budget 8000

# Run tests and auto-heal failures
norescan test --fix

# Start Model Context Protocol server
norescan mcp
```

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
