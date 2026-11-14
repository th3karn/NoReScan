#!/usr/bin/env node
import { NoReScanCore } from '@norescan/core';

async function main() {
  const core = new NoReScanCore(process.cwd());
  const config = await core.loadConfig();
  if (!config) {
    console.error('norescan is not initialized in this workspace. Run "norescan init".');
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

