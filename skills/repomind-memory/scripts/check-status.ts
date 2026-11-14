#!/usr/bin/env node
import { RepoMindCore } from '@repomind/core';

async function main() {
  const core = new RepoMindCore(process.cwd());
  const config = await core.loadConfig();
  if (!config) {
    console.error('RepoMind is not initialized in this workspace. Run "repomind init".');
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
