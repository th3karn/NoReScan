import { Command } from 'commander';
import { CodeCacheCore } from '@code-cache/core';
import { CliOutput } from './output.js';
import pc from 'picocolors';
import path from 'node:path';
import fs from 'node:fs/promises';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('code-cache')
    .description('Universal persistent codebase memory infrastructure for AI coding agents')
    .version('0.1.0')
    .option('--json', 'Output results as pure JSON to stdout', false)
    .option('--quiet', 'Suppress non-essential console output', false)
    .option('--verbose', 'Enable verbose logging', false)
    .option('-C, --project <path>', 'Path to repository root', process.cwd());

  const getCore = (cmd: Command): { core: CodeCacheCore; output: CliOutput
} => {
  const opts = cmd.optsWithGlobals();
  const output = new CliOutput(opts.json, opts.quiet);
  const core = new CodeCacheCore(opts.project);
  return { core, output };
};

// 1. code-cache init [name]
program
  .command('init [name]')
  .description('Initialize code-cache in the repository')
  .action(async (name, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      const config = await core.init(name);
      output.success('init', `code-cache initialized successfully for project "${config.projectName}"`, config, config.projectId);
    } catch (err: any) {
      output.error('init', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 2. code-cache scan [--force]
program
  .command('scan')
  .description('Scan repository, fingerprint files, and incrementally update analysis cache')
  .option('--force', 'Force re-analysis of all files regardless of cached hashes', false)
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const summary = await core.scan({ force: options.force });
      if (cmd.optsWithGlobals().json) {
        output.success('scan', 'Scan completed', summary, core.config?.projectId);
      } else {
        output.raw(pc.bold(pc.cyan('\ncode-cache Index Summary')));
        output.raw('----------------------------------------');
        output.raw(`Total files scanned:       ${pc.bold(summary.scanned)}`);
        output.raw(`Unchanged files (reused):  ${pc.green(summary.unchanged)}`);
        output.raw(`Modified files:            ${pc.yellow(summary.modified)}`);
        output.raw(`New files added:           ${pc.green(summary.added)}`);
        output.raw(`Deleted files:             ${pc.red(summary.deleted)}`);
        output.raw(`Renamed files:             ${pc.blue(summary.renamed)}`);
        output.raw(`Invalidated dependents:    ${pc.magenta(summary.invalidatedDependents)}`);
        output.raw(`Duration:                  ${summary.durationMs}ms\n`);
      }
    } catch (err: any) {
      output.error('scan', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 3. code-cache refresh [path]
program
  .command('refresh [filePath]')
  .description('Re-analyze a specific file or all modified files')
  .action(async (filePath, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const result = await core.refreshFile(filePath);
      output.success('refresh', result.details, result, core.config?.projectId);
    } catch (err: any) {
      output.error('refresh', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 4. code-cache status
program
  .command('status')
  .description('Display persistent memory status, file counts, and cache health')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const status = core.getStatus();
      if (cmd.optsWithGlobals().json) {
        output.success('status', 'Status retrieved', status, status.projectId);
      } else {
        output.raw(pc.bold(pc.cyan(`\ncode-cache Status — ${status.projectName}`)));
        output.raw('----------------------------------------');
        output.raw(`Total indexed files:   ${pc.bold(status.totalFiles)}`);
        output.raw(`Valid cached analyses: ${pc.green(status.validAnalyses)}`);
        output.raw(`Stale analyses:        ${status.staleAnalyses > 0 ? pc.yellow(status.staleAnalyses) : pc.dim(0)}`);
        output.raw(`Architectural ADRs:    ${pc.bold(status.decisionsCount)}`);
        output.raw(`Recorded sessions:     ${pc.bold(status.sessionsCount)}`);
        output.raw(`Storage mode:          SQLite (WAL mode)`);
        output.raw(`Last scan:             ${status.lastScannedAt ? status.lastScannedAt : 'Never'}\n`);
      }
    } catch (err: any) {
      output.error('status', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 5. code-cache context <query>
program
  .command('context <query>')
  .description('Retrieve task-relevant files, dependencies, and decisions within token budget')
  .option('--budget <tokens>', 'Maximum estimated token budget', '8000')
  .option('--format <format>', 'Output format (markdown or json)', 'markdown')
  .action(async (query, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const budget = parseInt(options.budget, 10);

      if (options.format === 'json' || cmd.optsWithGlobals().json) {
        const manifest = core.contextEngine.getContext(query, budget);
        output.success('context', 'Context retrieved', manifest, core.config?.projectId);
      } else {
        const markdown = core.contextEngine.getContextMarkdown(query, budget);
        output.raw(markdown);
      }
    } catch (err: any) {
      output.error('context', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 6. code-cache analyze <path> [--all]
program
  .command('analyze <filePath>')
  .description('Run structural AST analysis on a file and display extracted metadata')
  .option('--all', 'Analyze all project files and report stats', false)
  .action(async (filePath, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const absPath = path.resolve(core.projectRoot, filePath);
      const relPath = path.relative(core.projectRoot, absPath).replace(/\\/g, '/');
      const ext = path.extname(relPath).toLowerCase();
      const langMap: Record<string, string> = {
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.py': 'python',
        '.sql': 'sql',
      };
      const lang = langMap[ext] || 'generic';
      const analysis = await core.analyzer.analyzeFile(absPath, relPath, lang);

      if (cmd.optsWithGlobals().json) {
        output.success('analyze', 'Analysis complete', analysis, core.config?.projectId);
      } else {
        output.raw(pc.bold(pc.cyan(`\ncode-cache AST Analysis: ${relPath}`)));
        output.raw('----------------------------------------');
        output.raw(`Summary:      ${analysis.summary}`);
        output.raw(`Symbols:      ${analysis.astMetadata.symbols.map((s) => `${s.name} (${s.kind})`).join(', ') || 'None'}`);
        output.raw(`Exports:      ${analysis.astMetadata.exports.map((e) => e.name).join(', ') || 'None'}`);
        output.raw(`Imports:      ${analysis.astMetadata.imports.map((i) => i.source).join(', ') || 'None'}`);
        if (analysis.astMetadata.routes && analysis.astMetadata.routes.length > 0) {
          output.raw(`Routes:       ${analysis.astMetadata.routes.map((r) => `${r.method} ${r.path}`).join(', ')}`);
        }
        output.raw('');
      }
    } catch (err: any) {
      output.error('analyze', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 7. code-cache explain <path>
program
  .command('explain <filePath>')
  .description('Explain stored AST analysis, symbols, exports, and dependencies for a file')
  .action(async (filePath, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const details = core.explain(filePath);
      if (!details) {
        output.error('explain', `File "${filePath}" is not indexed in code-cache memory.`);
        process.exitCode = 1;
        return;
      }

      if (cmd.optsWithGlobals().json) {
        output.success('explain', 'File explained', details, core.config?.projectId);
      } else {
        output.raw(pc.bold(pc.cyan(`\ncode-cache Analysis: ${filePath}`)));
        output.raw('----------------------------------------');
        output.raw(`Summary:                 ${details.analysis?.summary || 'No summary'}`);
        output.raw(`Content Hash:            ${details.file.contentHash}`);
        output.raw(`Language:                ${details.file.language}`);
        output.raw(`Status:                  ${details.file.status}`);
        output.raw(`Upstream Dependencies:   ${details.dependencies.length}`);
        output.raw(`Downstream Dependents:   ${details.dependents.length}`);
        output.raw(`Transitive Blast Radius: ${details.blastRadius.length} files\n`);
      }
    } catch (err: any) {
      output.error('explain', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 8. code-cache diff [--cached]
program
  .command('diff')
  .description('Show added, modified, deleted, and unchanged files compared to stored memory')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const diff = await core.getDiff();
      if (cmd.optsWithGlobals().json) {
        output.success('diff', 'Diff calculated', diff, core.config?.projectId);
      } else {
        output.raw(pc.bold(pc.cyan('\ncode-cache Codebase Diff')));
        output.raw('----------------------------------------');
        output.raw(`Unchanged (cached): ${pc.green(diff.unchanged)}`);
        output.raw(`Modified:           ${pc.yellow(diff.modified.length)} ${diff.modified.length ? `(${diff.modified.join(', ')})` : ''}`);
        output.raw(`Added:              ${pc.green(diff.added.length)} ${diff.added.length ? `(${diff.added.join(', ')})` : ''}`);
        output.raw(`Deleted:            ${pc.red(diff.deleted.length)} ${diff.deleted.length ? `(${diff.deleted.join(', ')})` : ''}\n`);
      }
    } catch (err: any) {
      output.error('diff', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 9. code-cache deps <path> [--tree] [--circular]
program
  .command('deps <filePath>')
  .description('Inspect file dependencies, blast radius, upstream/downstream graph, and circular dependencies')
  .option('--tree', 'Show dependency tree representation', false)
  .option('--circular', 'Check specifically for circular dependencies', false)
  .action(async (filePath, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const deps = core.getDependencies(filePath);
      if (!deps) {
        output.error('deps', `File "${filePath}" has no indexed dependency data.`);
        process.exitCode = 1;
        return;
      }

      if (cmd.optsWithGlobals().json) {
        output.success('deps', 'Dependencies retrieved', deps, core.config?.projectId);
      } else {
        output.raw(pc.bold(pc.cyan(`\nDependency Inspection: ${filePath}`)));
        output.raw('----------------------------------------');
        output.raw(`Upstream imports:   ${deps.upstream.join(', ') || 'None'}`);
        output.raw(`Downstream callers: ${deps.downstream.join(', ') || 'None'}`);
        output.raw(`Blast Radius Cone:  ${deps.blastRadius.join(', ') || 'Self only'}`);
        if (deps.cycles.length > 0) {
          output.raw(pc.yellow(`Circular Dependencies Detected: ${deps.cycles.map((c) => c.join(' -> ')).join(' | ')}`));
        } else {
          output.raw(pc.green('No circular dependencies detected.'));
        }
        output.raw('');
      }
    } catch (err: any) {
      output.error('deps', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 10. code-cache search <query> [--limit <n>]
program
  .command('search <query>')
  .description('Search project memory across file paths, symbols, routes, and architectural decisions')
  .option('--limit <n>', 'Maximum results per category', '20')
  .action(async (query, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const limit = parseInt(options.limit, 10);
      const results = core.search(query, limit);

      if (cmd.optsWithGlobals().json) {
        output.success('search', 'Search completed', results, core.config?.projectId);
      } else {
        output.raw(pc.bold(pc.cyan(`\nSearch Results for "${query}"`)));
        output.raw('----------------------------------------');
        if (results.files.length > 0) {
          output.raw(pc.bold(`Files (${results.files.length}):`));
          for (const f of results.files) output.raw(`  - ${f.relativePath} [${f.status}]`);
        }
        if (results.symbols.length > 0) {
          output.raw(pc.bold(`\nSymbols (${results.symbols.length}):`));
          for (const s of results.symbols) output.raw(`  - ${s.name} (${s.kind}) in ${s.file}`);
        }
        if (results.routes.length > 0) {
          output.raw(pc.bold(`\nRoutes (${results.routes.length}):`));
          for (const r of results.routes) output.raw(`  - ${r.method} ${r.path} in ${r.file}`);
        }
        if (results.decisions.length > 0) {
          output.raw(pc.bold(`\nDecisions (${results.decisions.length}):`));
          for (const d of results.decisions) output.raw(`  - ${d.title}: ${d.decision}`);
        }
        if (
          results.files.length === 0 &&
          results.symbols.length === 0 &&
          results.routes.length === 0 &&
          results.decisions.length === 0
        ) {
          output.raw(pc.dim('No matching memory records found.'));
        }
        output.raw('');
      }
    } catch (err: any) {
      output.error('search', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 11. code-cache decisions [add|list]
const decisionsCmd = program.command('decisions').description('Manage or view architectural decisions (ADRs)');

decisionsCmd
  .command('list', { isDefault: true })
  .description('List recorded architectural decisions')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const list = core.decisionRepo.listByProject(core.config.projectId);
      if (cmd.optsWithGlobals().json) {
        output.success('decisions:list', 'Decisions listed', list, core.config.projectId);
      } else {
        output.raw(pc.bold(pc.cyan(`\nArchitectural Decisions (${list.length})`)));
        output.raw('----------------------------------------');
        for (const d of list) {
          output.raw(`${pc.bold(d.title)} [${d.createdAt.slice(0, 10)}]`);
          output.raw(`  Decision:  ${d.decision}`);
          output.raw(`  Rationale: ${d.rationale}`);
          if (d.affectedFiles.length > 0) {
            output.raw(`  Files:     ${d.affectedFiles.join(', ')}`);
          }
          output.raw('');
        }
      }
    } catch (err: any) {
      output.error('decisions:list', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

decisionsCmd
  .command('add')
  .description('Record a new architectural decision')
  .requiredOption('--title <title>', 'Decision title')
  .requiredOption('--decision <decision>', 'What was decided')
  .requiredOption('--rationale <rationale>', 'Why it was decided')
  .option('--files <files>', 'Comma-separated affected file paths', '')
  .action(async (opts, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const files = opts.files ? opts.files.split(',').map((f: string) => f.trim()) : [];
      const record = core.recordDecision({
        title: opts.title,
        decision: opts.decision,
        rationale: opts.rationale,
        affectedFiles: files,
      });
      output.success('decisions:add', `Decision "${record.title}" recorded successfully`, record, core.config.projectId);
    } catch (err: any) {
      output.error('decisions:add', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 12. code-cache history [--limit <n>]
program
  .command('history')
  .description('View agent session activity history and tasks')
  .option('--limit <n>', 'Maximum entries to display', '20')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const limit = parseInt(options.limit, 10);
      const history = core.getHistory(limit);

      if (cmd.optsWithGlobals().json) {
        output.success('history', 'History retrieved', history, core.config?.projectId);
      } else {
        output.raw(pc.bold(pc.cyan(`\nAgent Activity History (${history.length})`)));
        output.raw('----------------------------------------');
        for (const s of history) {
          output.raw(`${pc.bold(s.agentName)} [${s.startedAt.slice(0, 19)}]`);
          if (s.summary) output.raw(`  Summary: ${s.summary}`);
          if (s.endedAt) output.raw(`  Ended:   ${s.endedAt.slice(0, 19)}`);
          output.raw('');
        }
        if (history.length === 0) {
          output.raw(pc.dim('No recorded agent sessions yet.'));
        }
      }
    } catch (err: any) {
      output.error('history', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 13. code-cache watch [--debounce <ms>]
program
  .command('watch')
  .description('Watch workspace for file changes and perform real-time incremental re-indexing')
  .option('--debounce <ms>', 'Debounce window in milliseconds', '500')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const debounceMs = parseInt(options.debounce, 10);
      output.raw(pc.cyan(`\nWatching ${core.projectRoot} for changes (debounce: ${debounceMs}ms)... Press Ctrl+C to stop.\n`));

      let debounceTimer: NodeJS.Timeout | null = null;
      const triggerScan = async () => {
        try {
          const summary = await core.scan();
          if (summary.modified > 0 || summary.added > 0 || summary.deleted > 0) {
            output.raw(`[${new Date().toLocaleTimeString()}] Indexed changes: ${summary.modified} modified, ${summary.added} added, ${summary.deleted} deleted (${summary.durationMs}ms)`);
          }
        } catch (err: any) {
          output.error('watch', err.message);
        }
      };

      const watcher = fs.watch(core.projectRoot, { recursive: true });
      for await (const event of watcher) {
        if (event.filename && (event.filename.includes('.git') || event.filename.includes('.code-cache') || event.filename.includes('node_modules'))) {
          continue;
        }
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          triggerScan();
        }, debounceMs);
      }
    } catch (err: any) {
      output.error('watch', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 14. code-cache mcp
program
  .command('mcp')
  .description('Run the code-cache Model Context Protocol server on stdio')
  .action(async (options, cmd) => {
    const { core } = getCore(cmd);
    try {
      await core.loadConfig();
      const { createMcpServer } = await import('@code-cache/mcp');
      const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');

      const server = createMcpServer(core);
      const transport = new StdioServerTransport();
      await server.connect(transport);
      process.stderr.write(`code-cache MCP server running on stdio for project: ${core.config?.projectName || 'workspace'}\n`);
    } catch (err: any) {
      process.stderr.write(`Fatal MCP error: ${err.message}\n`);
      process.exit(1);
    }
  });

// 15. code-cache agent [list|install|uninstall|validate]
const agentCmd = program.command('agent').description('Manage integrations for AI coding agents');

agentCmd
  .command('list', { isDefault: true })
  .description('List supported agents and their configuration status')
  .action(async (options, cmd) => {
    const { output } = getCore(cmd);
    const { getAllAdapters } = await import('@code-cache/agent-adapters');
    const projectRoot = cmd.optsWithGlobals().project;
    const adapters = getAllAdapters();

    const list = [];
    for (const a of adapters) {
      const isConfigured = await a.validate(projectRoot);
      list.push({
        name: a.name,
        displayName: a.displayName,
        description: a.description,
        configured: isConfigured,
      });
    }

    if (cmd.optsWithGlobals().json) {
      output.success('agent:list', 'Agents listed', list);
    } else {
      output.raw(pc.bold(pc.cyan('\nSupported AI Agent Integrations')));
      output.raw('----------------------------------------');
      for (const item of list) {
        const status = item.configured ? pc.green('[Configured]') : pc.dim('[Not configured]');
        output.raw(`${pc.bold(item.displayName)} (${item.name}) ${status}`);
        output.raw(`  ${pc.dim(item.description)}`);
      }
      output.raw('');
    }
  });

agentCmd
  .command('install <agent>')
  .description('Install MCP configuration and rules for a target agent (e.g. antigravity, cursor, claude-code)')
  .option('--dry-run', 'Simulate changes without writing files', false)
  .action(async (agentName, options, cmd) => {
    const { output } = getCore(cmd);
    const { getAdapter, getAllAdapters } = await import('@code-cache/agent-adapters');
    const projectRoot = cmd.optsWithGlobals().project;

    const targets = agentName === '--all' || agentName === 'all'
      ? getAllAdapters()
      : [getAdapter(agentName)];

    if (!targets[0]) {
      output.error('agent:install', `Unknown agent "${agentName}". Supported: antigravity, cursor, claude-code, codex, vscode.`);
      process.exitCode = 1;
      return;
    }

    for (const target of targets) {
      if (!target) continue;
      const modified = await target.install(projectRoot, options.dryRun);
      output.success('agent:install', `Installed configuration for ${target.displayName}`, { modified });
    }
  });

agentCmd
  .command('uninstall <agent>')
  .description('Remove MCP configuration and rules for a target agent')
  .action(async (agentName, options, cmd) => {
    const { output } = getCore(cmd);
    const { getAdapter } = await import('@code-cache/agent-adapters');
    const projectRoot = cmd.optsWithGlobals().project;
    const adapter = getAdapter(agentName);
    if (!adapter) {
      output.error('agent:uninstall', `Unknown agent "${agentName}".`);
      process.exitCode = 1;
      return;
    }

    const removed = await adapter.uninstall(projectRoot);
    output.success('agent:uninstall', `Uninstalled configuration for ${adapter.displayName}`, { removed });
  });

agentCmd
  .command('validate [agent]')
  .description('Validate that an agent adapter configuration is correctly installed')
  .action(async (agentName, options, cmd) => {
    const { output } = getCore(cmd);
    const { getAdapter, getAllAdapters } = await import('@code-cache/agent-adapters');
    const projectRoot = cmd.optsWithGlobals().project;
    const adapters = agentName ? [getAdapter(agentName)] : getAllAdapters();

    const results: Array<{ agent: string; valid: boolean }> = [];
    for (const a of adapters) {
      if (!a) continue;
      const valid = await a.validate(projectRoot);
      results.push({ agent: a.name, valid });
    }

    output.success('agent:validate', 'Validation completed', results);
  });

// 16. code-cache skill [list|install|validate]
const skillCmd = program.command('skill').description('Manage code-cache Agent Skills');

skillCmd
  .command('list', { isDefault: true })
  .description('List available code-cache skills')
  .action(async (options, cmd) => {
    const { output } = getCore(cmd);
    const skills = [
      {
        name: 'code-cache-memory',
        description: 'Persistent codebase-memory layer for AI coding agents with verified cache and ADRs',
        location: 'skills/code-cache-memory/SKILL.md',
      },
    ];
    output.success('skill:list', 'Available skills', skills);
  });

skillCmd
  .command('install')
  .description('Install code-cache-memory skill to active agent directory')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    const targetDir = path.join(core.projectRoot, '.agents', 'skills', 'code-cache-memory');
    await fs.mkdir(targetDir, { recursive: true });
    output.success('skill:install', `Skill installed to ${targetDir}`, { targetDir });
  });

skillCmd
  .command('validate')
  .description('Validate skill definition and configuration files')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    const skillFile = path.join(core.projectRoot, 'skills', 'code-cache-memory', 'SKILL.md');
    try {
      await fs.access(skillFile);
      output.success('skill:validate', 'Skill file is valid', { file: skillFile, valid: true });
    } catch {
      output.error('skill:validate', `Skill file not found at ${skillFile}`);
    }
  });

// 17. code-cache doctor
program
  .command('doctor')
  .description('Run system diagnostics and verify database integrity')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const diag = core.doctor();
      if (cmd.optsWithGlobals().json) {
        output.success('doctor', 'Diagnostics completed', diag, core.config?.projectId);
      } else {
        output.raw(pc.bold(pc.cyan('\ncode-cache System Health Check')));
        output.raw('----------------------------------------');
        for (const c of diag.checks) {
          const mark = c.passed ? pc.green('✔') : pc.red('✖');
          output.raw(`${mark} ${c.name}: ${c.message}`);
        }
        output.raw('');
      }
    } catch (err: any) {
      output.error('doctor', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 18. code-cache clean [--stale|--all]
program
  .command('clean')
  .description('Clean cached analyses or reset memory database')
  .option('--stale', 'Purge only stale analyses', false)
  .option('--all', 'Reset entire indexed file cache and analyses', false)
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      core.clean(options.stale);
      output.success('clean', options.stale ? 'Stale analyses purged' : 'Memory database reset successfully');
    } catch (err: any) {
      output.error('clean', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 19. code-cache export [--output <file>]
program
  .command('export')
  .description('Export project memory records into a portable JSON document')
  .option('-o, --output <file>', 'Output JSON file path')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const dump = await core.exportMemory();
      if (options.output) {
        const outPath = path.resolve(core.projectRoot, options.output);
        await fs.writeFile(outPath, JSON.stringify(dump, null, 2), 'utf8');
        output.success('export', `Memory successfully exported to ${outPath}`, { outPath });
      } else {
        output.raw(JSON.stringify(dump, null, 2));
      }
    } catch (err: any) {
      output.error('export', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 20. code-cache import <file>
program
  .command('import <file>')
  .description('Import project memory records from a JSON file into SQLite')
  .action(async (file, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const inPath = path.resolve(core.projectRoot, file);
      const content = await fs.readFile(inPath, 'utf8');
      const data = JSON.parse(content);
      const result = await core.importMemory(data);
      output.success('import', `Successfully imported ${result.importedFiles} files and ${result.importedDecisions} decisions`, result);
    } catch (err: any) {
      output.error('import', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 21. code-cache db [status|migrate|backup]
const dbCmd = program.command('db').description('Direct SQLite database maintenance and operations');

dbCmd
  .command('status', { isDefault: true })
  .description('Show database connection, file path, size, and WAL status')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const dbPath = path.join(core.projectRoot, '.code-cache', 'code-cache.db');
      const stat = await fs.stat(dbPath);
      const info = {
        path: dbPath,
        sizeBytes: stat.size,
        sizeKb: Math.round(stat.size / 1024),
        walEnabled: true,
      };
      output.success('db:status', 'Database status retrieved', info);
    } catch (err: any) {
      output.error('db:status', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

dbCmd
  .command('backup [destination]')
  .description('Create an atomic backup of the database')
  .action(async (destination, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const backupPath = await core.backupDatabase(destination);
      output.success('db:backup', `Database backup created at ${backupPath}`, { backupPath });
    } catch (err: any) {
      output.error('db:backup', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// 22. code-cache config [list|get|set|reset]
const configCmd = program.command('config').description('Inspect or modify code-cache configuration');

configCmd
  .command('list', { isDefault: true })
  .description('Display active workspace configuration')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      output.success('config:list', 'Active configuration', core.config);
    } catch (err: any) {
      output.error('config:list', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

configCmd
  .command('get <key>')
  .description('Get a configuration value')
  .action(async (key, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const val = (core.config as any)[key];
      output.success('config:get', `${key} = ${JSON.stringify(val)}`, { key, value: val });
    } catch (err: any) {
      output.error('config:get', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

configCmd
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(async (key, value, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      let parsedVal: any = value;
      try { parsedVal = JSON.parse(value); } catch { }
      (core.config as any)[key] = parsedVal;
      const configPath = path.join(core.projectRoot, '.code-cache', 'config.json');
      await fs.writeFile(configPath, JSON.stringify(core.config, null, 2), 'utf8');
      output.success('config:set', `Set ${key} = ${JSON.stringify(parsedVal)}`, { key, value: parsedVal });
    } catch (err: any) {
      output.error('config:set', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// ==========================================
// Polyglot & Ecosystem Intelligence Commands
// ==========================================

// code-cache languages
program
  .command('languages')
  .description('Detect programming languages, file distribution, and monorepo components')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const res = await core.getLanguages();
      if (cmd.optsWithGlobals().json) {
        output.success('languages', 'Languages detected', res);
      } else {
        output.raw(pc.bold(pc.cyan('\nDetected Languages & Distributions')));
        output.raw('----------------------------------------');
        for (const stat of res.stats) {
          output.raw(
            `${pc.bold(stat.displayName.padEnd(16))} ${stat.percentage.toFixed(1).padStart(5)}%  ` +
            `(${stat.fileCount} files, ${(stat.byteCount / 1024).toFixed(1)} KB)`
          );
        }
        if (res.components.length > 0) {
          output.raw(pc.bold(pc.cyan('\nMonorepo Components:')));
          for (const comp of res.components) {
            output.raw(`  - ${pc.bold(comp.name)} (${comp.primaryLanguage}, ${comp.ecosystemId}) in ${comp.relativePath}`);
          }
        }
        output.raw('');
      }
    } catch (err: any) {
      output.error('languages', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// code-cache ecosystems
program
  .command('ecosystems')
  .description('List active and supported package managers and ecosystem adapters')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const eco = await core.getEcosystems();
      if (cmd.optsWithGlobals().json) {
        output.success('ecosystems', 'Ecosystem adapters', eco);
      } else {
        output.raw(pc.bold(pc.cyan('\nEcosystem Adapters')));
        output.raw('----------------------------------------');
        for (const e of eco) {
          const status = e.active ? pc.green('ACTIVE') : pc.gray('SUPPORTED');
          output.raw(`[${status}] ${pc.bold(e.displayName.padEnd(20))} (${e.supportedLanguages.join(', ')})`);
        }
        output.raw('');
      }
    } catch (err: any) {
      output.error('ecosystems', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// code-cache packages [list|tree|explain <pkg>]
const packagesCmd = program.command('packages').description('Inspect package manager dependencies across ecosystems');

packagesCmd
  .command('list', { isDefault: true })
  .description('List all discovered package dependencies across active manifests')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const pkgs = core.getPackageDependencies();
      if (cmd.optsWithGlobals().json) {
        output.success('packages:list', 'Discovered package dependencies', pkgs);
      } else {
        output.raw(pc.bold(pc.cyan('\nDiscovered Dependencies')));
        output.raw('----------------------------------------');
        for (const p of pkgs) {
          const kind = p.isDirect ? pc.green('direct') : pc.gray('indirect');
          output.raw(`${pc.bold(p.name)} @ ${p.declaredVersion} [${kind}, ${p.dependencyType}]`);
        }
        output.raw(`\nTotal dependencies: ${pkgs.length}\n`);
      }
    } catch (err: any) {
      output.error('packages:list', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

packagesCmd
  .command('explain <packageName>')
  .description('Explain why a package is depended upon and its dependents')
  .action(async (packageName, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const pkgs = core.getPackageDependencies();
      const found = pkgs.filter((p) => p.name === packageName);
      if (found.length === 0) {
        output.raw(pc.yellow(`Package "${packageName}" not found in project dependencies.`));
      } else {
        output.success('packages:explain', `Package explanation for ${packageName}`, found);
      }
    } catch (err: any) {
      output.error('packages:explain', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// code-cache commands [search <q>|explain <cmd>]
const commandsCmd = program.command('commands').description('Command intelligence: search and explain discovered scripts and commands');

commandsCmd
  .command('list', { isDefault: true })
  .description('List discovered project commands (build, test, dev, lint)')
  .option('-c, --category <category>', 'Filter by category (build, test, lint, dev, run)')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const cmds = core.getProjectCommands(options.category);
      if (cmd.optsWithGlobals().json) {
        output.success('commands:list', 'Discovered project commands', cmds);
      } else {
        output.raw(pc.bold(pc.cyan('\nDiscovered Project Commands')));
        output.raw('----------------------------------------');
        for (const c of cmds) {
          const safe = c.safeToRun ? pc.green('SAFE') : pc.red('UNSAFE');
          output.raw(`[${c.category.toUpperCase().padEnd(6)}] ${pc.bold(c.name)} -> ${c.rawCommand} [${safe}]`);
        }
        output.raw(`\nTotal commands: ${cmds.length}\n`);
      }
    } catch (err: any) {
      output.error('commands:list', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

commandsCmd
  .command('search <query>')
  .description('Search project commands by intent or query')
  .action(async (query, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const cmds = core.getProjectCommands();
      const q = query.toLowerCase();
      const filtered = cmds.filter((c) => c.name.toLowerCase().includes(q) || c.rawCommand.toLowerCase().includes(q));
      output.success('commands:search', `Found ${filtered.length} command(s) matching "${query}"`, filtered);
    } catch (err: any) {
      output.error('commands:search', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

commandsCmd
  .command('explain <commandName>')
  .description('Inspect safety, network access, and parameters of a command')
  .action(async (commandName, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const inspection = core.inspectCommand(commandName);
      if (!inspection) {
        output.raw(pc.yellow(`Command "${commandName}" not found.`));
      } else {
        output.success('commands:explain', `Command inspection: ${commandName}`, inspection);
      }
    } catch (err: any) {
      output.error('commands:explain', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// code-cache env [doctor|check]
const envCmd = program.command('env').description('Environment intelligence: toolchain versions and requirements');

envCmd
  .command('doctor', { isDefault: true })
  .description('Probe system toolchains and installed runtimes')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const envStatus = await core.getEnvironmentStatus();
      if (cmd.optsWithGlobals().json) {
        output.success('env:doctor', 'Environment status', envStatus);
      } else {
        output.raw(pc.bold(pc.cyan('\nSystem Toolchain Environment')));
        output.raw('----------------------------------------');
        for (const env of envStatus) {
          const status = env.installed ? pc.green(`v${env.detectedVersion}`) : pc.red('NOT INSTALLED');
          output.raw(`${pc.bold(env.displayName.padEnd(20))} ${status}`);
        }
        output.raw('');
      }
    } catch (err: any) {
      output.error('env:doctor', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// code-cache workspace [list|graph]
const wsCmd = program.command('workspace').description('Monorepo workspace packages and members');

wsCmd
  .command('list', { isDefault: true })
  .description('List monorepo packages and members')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const members = core.getWorkspaces();
      if (cmd.optsWithGlobals().json) {
        output.success('workspace:list', 'Workspace members', members);
      } else {
        output.raw(pc.bold(pc.cyan('\nMonorepo Workspace Members')));
        output.raw('----------------------------------------');
        for (const m of members) {
          output.raw(`${pc.bold(m.name)} in ${m.relativePath} [${m.ecosystemId}]`);
        }
        output.raw(`\nTotal members: ${members.length}\n`);
      }
    } catch (err: any) {
      output.error('workspace:list', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// code-cache run <command>
program
  .command('run <commandName>')
  .description('Safely execute an authorized project command with preflight security check')
  .action(async (commandName, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const res = await core.executeCommand(commandName);
      if (res.success) {
        output.success('run', `Command executed successfully: ${commandName}`, { output: res.output });
        if (!cmd.optsWithGlobals().json) {
          output.raw(res.output);
        }
      } else {
        output.error('run', res.output);
        process.exitCode = 1;
      }
    } catch (err: any) {
      output.error('run', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// ==========================================
// Causal Graph, Hot Files & Diff Blast Commands
// ==========================================

// code-cache graph [--format <json|dot|mermaid>]
program
  .command('graph')
  .description('Display or export the full causal dependency graph')
  .option('-f, --format <format>', 'Output format: json, dot, or mermaid', 'json')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      if (options.format === 'mermaid') {
        output.raw(core.cartographer.toMermaid());
      } else if (options.format === 'dot') {
        output.raw(core.cartographer.toDot());
      } else {
        output.success('graph', 'Causal graph data', core.getCausalGraph());
      }
    } catch (err: any) {
      output.error('graph', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// code-cache hot-files [--limit <n>]
program
  .command('hot-files')
  .description('List the most load-bearing files in the project (highest in-degree)')
  .option('-l, --limit <limit>', 'Maximum files to list', '10')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const limit = parseInt(options.limit, 10) || 10;
      const hot = core.getHotFiles().slice(0, limit);
      if (cmd.optsWithGlobals().json) {
        output.success('hot-files', 'Hot load-bearing files', hot);
      } else {
        output.raw(pc.bold(pc.cyan('\nHot Files (Load-bearing with highest in-degree)')));
        output.raw('----------------------------------------');
        for (const h of hot) {
          output.raw(`${pc.bold(h.relativePath.padEnd(45))} ${pc.magenta(h.inDegree)} dependents`);
        }
        output.raw('');
      }
    } catch (err: any) {
      output.error('hot-files', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// code-cache blast <file-or-diff>
program
  .command('blast <fileOrDiff>')
  .description('Calculate blast radius cone of potential breakage from file path or git diff')
  .option('-d, --depth <depth>', 'Maximum traversal depth', '10')
  .action(async (fileOrDiff, options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const maxDepth = parseInt(options.depth, 10) || 10;
      let blastResult;

      // Check if argument is a file path or a diff string
      if (fileOrDiff.includes('\n') || fileOrDiff.includes('diff --git')) {
        blastResult = core.blastDiff(fileOrDiff, maxDepth);
      } else {
        blastResult = core.cartographer.calculateBlastRadius([fileOrDiff], maxDepth);
      }

      if (cmd.optsWithGlobals().json) {
        output.success('blast', 'Blast radius calculation', blastResult);
      } else {
        output.raw(pc.bold(pc.red('\nBlast Radius Cone (Potential Breakage)')));
        output.raw('----------------------------------------');
        output.raw(`Seed files: ${blastResult.seedFiles.join(', ')}`);
        output.raw(`Total affected upstream files: ${pc.bold(pc.yellow(blastResult.totalAffected))}\n`);
        for (const f of blastResult.blastCone) {
          output.raw(`  ${pc.red('💥')} ${f}`);
        }
        output.raw('');
      }
    } catch (err: any) {
      output.error('blast', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// ==========================================
// Hybrid Memory & Synchronization Commands
// ==========================================
const syncCmd = program.command('sync').description('Hybrid memory synchronization (Architecture Section 11)');

syncCmd
  .command('status', { isDefault: true })
  .description('Display hybrid sync cursor, device ID, and offline queue status')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const status = core.getSyncStatus();
      output.success('sync:status', 'Hybrid synchronization status', status);
    } catch (err: any) {
      output.error('sync:status', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

syncCmd
  .command('push')
  .description('Export sanitized sync payload for code-cache Cloud or authorized peers')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const payload = core.pushSyncPayload();
      output.success('sync:push', 'Push payload generated (source code excluded by policy)', payload);
    } catch (err: any) {
      output.error('sync:push', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

// ==========================================
// REST API Server & Cartographer Dashboard UI
// ==========================================
program
  .command('serve')
  .description('Start the local code-cache REST API server and Cartographer Dashboard UI')
  .option('-p, --port <port>', 'Server port', '31415')
  .option('-H, --host <host>', 'Server host', '127.0.0.1')
  .action(async (options, cmd) => {
    const { core, output } = getCore(cmd);
    try {
      await core.loadConfig();
      const port = parseInt(options.port, 10) || 31415;
      const info = await core.startRestServer({ port, host: options.host });
      output.raw(pc.bold(pc.green(`\ncode-cache REST API & Cartographer UI live at ${info.url}`)));
      output.raw(`API health endpoint:   ${pc.cyan(`${info.url}/health`)}`);
      output.raw(`Causal graph:          ${pc.cyan(`${info.url}/api/v1/graph`)}`);
      output.raw(`Blast radius endpoint: ${pc.cyan(`${info.url}/api/v1/blast-radius`)}`);
      output.raw(`Dashboard UI:          ${pc.cyan(`${info.url}/dashboard`)}\n`);
      output.raw('Press Ctrl+C to stop.\n');

      // Keep process open
      await new Promise(() => { });
    } catch (err: any) {
      output.error('serve', err.message, err);
      process.exitCode = 1;
    } finally {
      core.close();
    }
  });

return program;
}
