#!/usr/bin/env node
import { RepoMindCore } from '@repomind/core';

async function main() {
  const query = process.argv.slice(2).join(' ') || 'Project architecture and overview';
  const core = new RepoMindCore(process.cwd());
  const config = await core.loadConfig();
  if (!config) {
    console.error('RepoMind is not initialized in this workspace. Run "repomind init".');
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
