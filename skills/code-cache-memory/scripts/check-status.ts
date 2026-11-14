#!/usr/bin/env node
import { CodeCacheCore } from '@code-cache/core';

async function main() {
  const core = new CodeCacheCore(process.cwd());
  const config = await core.loadConfig();
  if (!config) {
    console.error('code-cache is not initialized in this workspace. Run "code-cache init".');
    process.exit(1);
  }
  const status = core.getStatus();
  console.log(JSON.stringify(status, null, 2));
  core.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

