#!/usr/bin/env node
import { BugBrainCore } from '@bugbrain/core';

async function main() {
  const core = new BugBrainCore(process.cwd());
  const config = await core.loadConfig();
  if (!config) {
    console.error('BugBrain is not initialized in this workspace. Run "bugbrain init".');
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

