import { Command } from 'commander';
import { RepoMindCore } from '@repomind/core';
import { CliOutput } from './output.js';
import pc from 'picocolors';
import path from 'node:path';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('repomind')
    .description('Universal persistent codebase memory infrastructure for AI coding agents')
    .version('0.1.0')
    .option('--json', 'Output results as pure JSON to stdout', false)
    .option('--quiet', 'Suppress non-essential console output', false)
    .option('--verbose', 'Enable verbose logging', false)
    .option('-C, --project <path>', 'Path to repository root', process.cwd());

  const getCore = (cmd: Command): { core: RepoMindCore; output: CliOutput } => {
    const opts = cmd.optsWithGlobals();
    const output = new CliOutput(opts.json, opts.quiet);
    const core = new RepoMindCore(opts.project);
    return { core, output };
  };

  // 1. repomind init [name]
  program
    .command('init [name]')
    .description('Initialize RepoMind in the repository')
    .action(async (name, options, cmd) => {
      const { core, output } = getCore(cmd);
      try {
        const config = await core.init(name);
        output.success('init', `RepoMind initialized successfully for project "${config.projectName}"`, config, config.projectId);
      } catch (err: any) {
        output.error('init', err.message, err);
        process.exitCode = 1;
      } finally {
        core.close();
      }
    });

  // 2. repomind scan
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
          output.raw(pc.bold(pc.cyan('\nRepoMind Index Summary')));
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

  // 3. repomind status
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
          output.raw(pc.bold(pc.cyan(`\nRepoMind Status — ${status.projectName}`)));
          output.raw('----------------------------------------');
          output.raw(`Total indexed files:   ${pc.bold(status.totalFiles)}`);
          output.raw(`Valid cached analyses: ${pc.green(status.validAnalyses)}`);
          output.raw(`Stale analyses:        ${status.staleAnalyses > 0 ? pc.yellow(status.staleAnalyses) : pc.dim(0)}`);
          output.raw(`Architectural ADRs:    ${pc.bold(status.decisionsCount)}`);
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

  // 4. repomind context <query>
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

  // 5. repomind explain <path>
  program
    .command('explain <filePath>')
    .description('Explain stored AST analysis, symbols, exports, and dependencies for a file')
    .action(async (filePath, options, cmd) => {
      const { core, output } = getCore(cmd);
      try {
        await core.loadConfig();
        const details = core.explain(filePath);
        if (!details) {
          output.error('explain', `File "${filePath}" is not indexed in RepoMind memory.`);
          process.exitCode = 1;
          return;
        }

        if (cmd.optsWithGlobals().json) {
          output.success('explain', 'File explained', details, core.config?.projectId);
        } else {
          output.raw(pc.bold(pc.cyan(`\nRepoMind Analysis: ${filePath}`)));
          output.raw('----------------------------------------');
          output.raw(`Summary:      ${details.analysis?.summary || 'No summary'}`);
          output.raw(`Content Hash: ${details.file.contentHash}`);
          output.raw(`Language:     ${details.file.language}`);
          output.raw(`Status:       ${details.file.status}`);
          output.raw(`Upstream Dependencies:   ${details.dependencies.length}`);
          output.raw(`Downstream Dependents:   ${details.dependents.length}\n`);
        }
      } catch (err: any) {
        output.error('explain', err.message, err);
        process.exitCode = 1;
      } finally {
        core.close();
      }
    });

  // 6. repomind decisions [add]
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
        const record = core.decisionRepo.recordDecision({
          projectId: core.config.projectId,
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

  // 7. repomind doctor
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
          output.raw(pc.bold(pc.cyan('\nRepoMind System Health Check')));
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

  // 8. repomind clean
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

  // 9. repomind agent
  const agentCmd = program.command('agent').description('Manage integrations and skills for AI coding agents');

  agentCmd
    .command('list', { isDefault: true })
    .description('List supported agents and their configuration status')
    .action(async (options, cmd) => {
      const { output } = getCore(cmd);
      const { getAllAdapters } = await import('@repomind/agent-adapters');
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
      const { getAdapter, getAllAdapters } = await import('@repomind/agent-adapters');
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
      const { getAdapter } = await import('@repomind/agent-adapters');
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

  return program;
}
