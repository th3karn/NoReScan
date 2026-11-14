# @norescan/mcp

> Universal Model Context Protocol (MCP) server for NoReScan persistent codebase memory.

[![npm version](https://img.shields.io/npm/v/@norescan/mcp.svg)](https://www.npmjs.com/package/@norescan/mcp)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub](https://img.shields.io/badge/GitHub-th3karn%2FNoReScan-brightgreen)](https://github.com/th3karn/NoReScan)

Part of the **[NoReScan](https://github.com/th3karn/NoReScan)** persistent codebase memory infrastructure for AI coding agents.

---

### Installation
```bash
npm install @norescan/mcp
```

### Running the Server
```bash
npx @norescan/mcp
```

### Connecting to Coding Assistants

#### Google Antigravity (`.gemini/antigravity/mcp/norescan.json`)
```json
{
  "name": "NoReScan",
  "command": "npx",
  "args": ["@norescan/mcp"]
}
```

#### Claude Code (`.claude/config.json`)
```json
{
  "mcpServers": {
    "norescan": {
      "command": "npx",
      "args": ["@norescan/mcp"]
    }
  }
}
```

#### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "norescan": {
      "command": "npx",
      "args": ["@norescan/mcp"]
    }
  }
}
```

### Supported Capabilities
- **27 MCP Tools**: Including `get_task_context`, `remember_file`, `inspect_file_memory`, `diagnose_and_fix`, `get_blast_radius`, `get_hot_files`.
- **6 MCP Resources**: Direct access to `norescan://project/overview`, `status`, `decisions`, `dependencies`, `hot-files`.

---

## Part of NoReScan

This package is part of the **NoReScan monorepo**. Learn more at:
- **GitHub Repository**: [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)
- **Main CLI**: [`@norescan/cli`](https://www.npmjs.com/package/@norescan/cli)

## License

Apache-2.0 © LostGit Solutions
