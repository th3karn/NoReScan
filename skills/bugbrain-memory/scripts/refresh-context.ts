#!/usr/bin/env node
import { BugBrainCore } from '@bugbrain/core';

async function main() {
  const query = process.argv.slice(2).join(' ') || 'Project architecture and overview';
  const core = new BugBrainCore(process.cwd());
  const config = await core.loadConfig();
  if (!config) {
    console.error('BugBrain is not initialized in this workspace. Run "BugBrain init".');
    process.exit(1);
  }
  const markdown = core.contextEngine.getContextMarkdown(query, 8000);
  console.log(markdown);
  core.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

