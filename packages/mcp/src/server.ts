import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CodeCacheCore } from '@code-cache/core';
import { assertPathContained, defaultLogger } from '@code-cache/shared';
import path from 'node:path';

export function createMcpServer(core: CodeCacheCore): Server {
  const server = new Server(
    {
      name: 'code-cache',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // 1. List Available Tools (14 tools)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'get_project_overview',
          description: 'Retrieve high-level project architecture, primary languages, directory overview, and stats',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_project_status',
          description: 'Retrieve real-time index status, total files, valid vs stale cached analyses',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_file_analysis',
          description: 'Retrieve cached structural AST analysis, exports, imports, and routes for a relative file path',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path of the file (e.g. src/auth/service.ts)' },
            },
            required: ['path'],
          },
        },
        {
          name: 'get_file_fingerprint',
          description: 'Verify file cryptographic SHA-256 fingerprint against stored index snapshot',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path of the file' },
            },
            required: ['path'],
          },
        },
        {
          name: 'get_task_context',
          description: 'Primary intelligence tool: returns task-relevant files, AST summaries, and decisions within token budget',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Natural language task description (e.g. "Update authentication login")' },
              budget: { type: 'number', description: 'Maximum token budget (default 8000)' },
              format: { type: 'string', enum: ['markdown', 'json'], description: 'Output format' },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_dependencies',
          description: 'Retrieve upstream (imported by this file) and downstream (files importing this file) module relationships',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path of the file' },
            },
            required: ['path'],
          },
        },
        {
          name: 'get_blast_radius',
          description: 'Calculate the transitive upstream cone of files affected by changes to specified files or a git diff',
          inputSchema: {
            type: 'object',
            properties: {
              files: { type: 'array', items: { type: 'string' }, description: 'Array of modified relative paths' },
            },
            required: ['files'],
          },
        },
        {
          name: 'get_hot_files',
          description: 'Identify the most load-bearing files in the codebase (highest in-degree dependent count)',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Maximum number of hot files to return (default 10)' },
            },
          },
        },
        {
          name: 'search_project_memory',
          description: 'Search project memory across file paths, symbols, routes, and architectural decisions',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search term or symbol name' },
              limit: { type: 'number', description: 'Maximum results per category' },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_changed_files',
          description: 'Detect modified, added, deleted, and renamed files compared to the persistent index without altering memory',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'refresh_analysis',
          description: 'Trigger incremental scan or re-analyze a specific file to refresh memory',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Optional relative path to refresh (refreshes all modified if omitted)' },
            },
          },
        },
        {
          name: 'record_decision',
          description: 'Record a new architectural decision record (ADR) into persistent memory',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Title of the architectural decision' },
              decision: { type: 'string', description: 'What was decided' },
              rationale: { type: 'string', description: 'Why this decision was made' },
              affectedFiles: { type: 'array', items: { type: 'string' }, description: 'List of affected relative paths' },
            },
            required: ['title', 'decision', 'rationale'],
          },
        },
        {
          name: 'get_decisions',
          description: 'Retrieve historical architectural decision records (ADRs) and technical rationale',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'record_session',
          description: 'Record an agent session summary and files modified during the turn',
          inputSchema: {
            type: 'object',
            properties: {
              agentName: { type: 'string', description: 'Agent identifier (e.g. antigravity, cursor)' },
              summary: { type: 'string', description: 'Summary of accomplishments' },
              metadata: { type: 'object', description: 'Optional session metadata' },
            },
            required: ['agentName', 'summary'],
          },
        },
        {
          name: 'get_languages',
          description: 'Detect programming languages, file distribution, byte percentages, and monorepo components',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_ecosystems',
          description: 'List active and supported package managers and ecosystem adapters (npm, pip, cargo, go, etc.)',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_package_dependencies',
          description: 'List package dependencies discovered across active manifests and lockfiles',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_project_commands',
          description: 'List discovered build, test, lint, dev, and run commands',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Optional filter: build, test, lint, dev, run' },
            },
          },
        },
        {
          name: 'get_environment_status',
          description: 'Probe installed system runtimes and validate project toolchain compatibility',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_workspaces',
          description: 'List monorepo workspace packages and member directories',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'execute_command',
          description: 'Safely execute an authorized project command with pre-flight security validation',
          inputSchema: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Name or raw command line of the discovered command' },
            },
            required: ['command'],
          },
        },
        {
          name: 'get_causal_graph',
          description: 'Retrieve full causal dependency graph, including in-degrees, out-degrees, density, and cycles',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'blast_diff',
          description: 'Blast a git diff patch to compute the transitive upstream cone of affected files',
          inputSchema: {
            type: 'object',
            properties: {
              diff: { type: 'string', description: 'Unified git diff string' },
              maxDepth: { type: 'number', description: 'Maximum upstream depth to traverse (default 10)' },
            },
            required: ['diff'],
          },
        },
        {
          name: 'get_sync_status',
          description: 'Retrieve hybrid memory synchronization status, device ID, cursor, and offline queue depth',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    };
  });

  // 2. Call Tool Request Handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'get_project_overview': {
          const status = core.getStatus();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    name: status.projectName,
                    root: status.rootPath,
                    totalFiles: status.totalFiles,
                    validAnalyses: status.validAnalyses,
                    staleAnalyses: status.staleAnalyses,
                    decisionsCount: status.decisionsCount,
                    sessionsCount: status.sessionsCount,
                    lastScannedAt: status.lastScannedAt,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'get_project_status': {
          const status = core.getStatus();
          return {
            content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
          };
        }

        case 'get_file_analysis': {
          const filePath = String(args?.path || '');
          assertPathContained(filePath, core.projectRoot);
          const details = core.explain(filePath);
          if (!details) {
            return {
              isError: true,
              content: [{ type: 'text', text: `File "${filePath}" is not indexed in code-cache.` }],
            };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(details, null, 2) }],
          };
        }

        case 'get_file_fingerprint': {
          const filePath = String(args?.path || '');
          assertPathContained(filePath, core.projectRoot);
          const files = core.fileRepo.getAllByProject(core.config.projectId);
          const snap = files.get(filePath.replace(/\\/g, '/'));
          if (!snap) {
            return {
              isError: true,
              content: [{ type: 'text', text: `File "${filePath}" is not indexed.` }],
            };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(snap, null, 2) }],
          };
        }

        case 'get_task_context': {
          const query = String(args?.query || '');
          const budget = typeof args?.budget === 'number' ? args.budget : 8000;
          const format = args?.format === 'json' ? 'json' : 'markdown';

          if (format === 'json') {
            const manifest = core.contextEngine.getContext(query, budget);
            return {
              content: [{ type: 'text', text: JSON.stringify(manifest, null, 2) }],
            };
          }

          const markdown = core.contextEngine.getContextMarkdown(query, budget);
          return {
            content: [{ type: 'text', text: markdown }],
          };
        }

        case 'get_dependencies': {
          const filePath = String(args?.path || '');
          assertPathContained(filePath, core.projectRoot);
          const deps = core.getDependencies(filePath);
          if (!deps) {
            return {
              isError: true,
              content: [{ type: 'text', text: `No dependency information for "${filePath}".` }],
            };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(deps, null, 2) }],
          };
        }

        case 'get_blast_radius': {
          const files = Array.isArray(args?.files) ? (args.files as string[]) : [];
          const cone = core.getBlastRadius(files);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    seedFiles: files,
                    blastRadiusCount: cone.length,
                    affectedFiles: cone,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'get_hot_files': {
          const limit = typeof args?.limit === 'number' ? args.limit : 10;
          const hotFiles = core.getHotFiles(limit);
          return {
            content: [{ type: 'text', text: JSON.stringify(hotFiles, null, 2) }],
          };
        }

        case 'search_project_memory': {
          const query = String(args?.query || '');
          const limit = typeof args?.limit === 'number' ? args.limit : 20;
          const results = core.search(query, limit);
          return {
            content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
          };
        }

        case 'get_changed_files': {
          const diff = await core.getDiff();
          return {
            content: [{ type: 'text', text: JSON.stringify(diff, null, 2) }],
          };
        }

        case 'refresh_analysis': {
          const targetPath = args?.path ? String(args.path) : undefined;
          const result = await core.refreshFile(targetPath);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'record_decision': {
          const title = String(args?.title || '');
          const decision = String(args?.decision || '');
          const rationale = String(args?.rationale || '');
          const affectedFiles = Array.isArray(args?.affectedFiles) ? (args.affectedFiles as string[]) : [];

          const adr = core.recordDecision({
            title,
            decision,
            rationale,
            affectedFiles,
          });

          return {
            content: [
              {
                type: 'text',
                text: `Decision recorded successfully with ID: ${adr.id}\nTitle: ${adr.title}`,
              },
            ],
          };
        }

        case 'get_decisions': {
          const decisions = core.decisionRepo.listByProject(core.config.projectId);
          return {
            content: [{ type: 'text', text: JSON.stringify(decisions, null, 2) }],
          };
        }

        case 'record_session': {
          const agentName = String(args?.agentName || 'unknown-agent');
          const summary = String(args?.summary || '');
          const metadata = typeof args?.metadata === 'object' && args.metadata ? (args.metadata as Record<string, unknown>) : undefined;

          const session = core.recordSession({
            agentName,
            summary,
            metadata,
          });

          return {
            content: [
              {
                type: 'text',
                text: `Session recorded with ID: ${session.id} for agent: ${session.agentName}`,
              },
            ],
          };
        }

        case 'get_languages': {
          const langs = await core.getLanguages();
          return {
            content: [{ type: 'text', text: JSON.stringify(langs, null, 2) }],
          };
        }

        case 'get_ecosystems': {
          const eco = await core.getEcosystems();
          return {
            content: [{ type: 'text', text: JSON.stringify(eco, null, 2) }],
          };
        }

        case 'get_package_dependencies': {
          const deps = core.getPackageDependencies();
          return {
            content: [{ type: 'text', text: JSON.stringify(deps, null, 2) }],
          };
        }

        case 'get_project_commands': {
          const cat = args?.category ? String(args.category) : undefined;
          const cmds = core.getProjectCommands(cat);
          return {
            content: [{ type: 'text', text: JSON.stringify(cmds, null, 2) }],
          };
        }

        case 'get_environment_status': {
          const envs = await core.getEnvironmentStatus();
          return {
            content: [{ type: 'text', text: JSON.stringify(envs, null, 2) }],
          };
        }

        case 'get_workspaces': {
          const ws = core.getWorkspaces();
          return {
            content: [{ type: 'text', text: JSON.stringify(ws, null, 2) }],
          };
        }

        case 'execute_command': {
          const cmd = String(args?.command || '');
          const res = await core.executeCommand(cmd);
          return {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
          };
        }

        case 'get_causal_graph': {
          const graphData = core.getCausalGraph();
          return {
            content: [{ type: 'text', text: JSON.stringify(graphData, null, 2) }],
          };
        }

        case 'blast_diff': {
          const diffText = String(args?.diff || '');
          const maxDepth = typeof args?.maxDepth === 'number' ? args.maxDepth : 10;
          const blast = core.blastDiff(diffText, maxDepth);
          return {
            content: [{ type: 'text', text: JSON.stringify(blast, null, 2) }],
          };
        }

        case 'get_sync_status': {
          const syncStatus = core.getSyncStatus();
          return {
            content: [{ type: 'text', text: JSON.stringify(syncStatus, null, 2) }],
          };
        }

        default:
          return {
            isError: true,
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          };
      }
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool execution failed: ${err.message}` }],
      };
    }
  });

  // 3. Resources Handlers (6 resources)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'code-cache://project/overview',
          name: 'Project Overview',
          mimeType: 'application/json',
          description: 'Summary of registered project metadata and structure',
        },
        {
          uri: 'code-cache://project/status',
          name: 'Project Status',
          mimeType: 'application/json',
          description: 'Real-time cache freshness and file indexing stats',
        },
        {
          uri: 'code-cache://project/decisions',
          name: 'Architectural Decisions',
          mimeType: 'application/json',
          description: 'All recorded architectural decisions (ADRs)',
        },
        {
          uri: 'code-cache://project/dependencies',
          name: 'Project Dependency Graph',
          mimeType: 'application/json',
          description: 'Complete directed import dependency graph',
        },
        {
          uri: 'code-cache://project/hot-files',
          name: 'Hot Load-Bearing Files',
          mimeType: 'application/json',
          description: 'Files with highest in-degree (most dependents)',
        },
        {
          uri: 'code-cache://project/schema',
          name: 'Memory Schema Definition',
          mimeType: 'text/plain',
          description: 'Active SQLite database schema and indexes',
        },
        {
          uri: 'code-cache://project/languages',
          name: 'Detected Languages',
          mimeType: 'application/json',
          description: 'Language breakdown and monorepo components',
        },
        {
          uri: 'code-cache://project/ecosystems',
          name: 'Ecosystem Adapters',
          mimeType: 'application/json',
          description: 'Active and supported package manager ecosystems',
        },
        {
          uri: 'code-cache://project/commands',
          name: 'Project Commands',
          mimeType: 'application/json',
          description: 'Discovered build, test, and run commands',
        },
        {
          uri: 'code-cache://project/packages',
          name: 'Package Dependencies',
          mimeType: 'application/json',
          description: 'Package dependencies from active manifests',
        },
        {
          uri: 'code-cache://project/workspaces',
          name: 'Monorepo Workspaces',
          mimeType: 'application/json',
          description: 'Monorepo workspace members and dependency graph',
        },
        {
          uri: 'code-cache://project/causal-graph',
          name: 'Causal Dependency Graph',
          mimeType: 'application/json',
          description: 'Full graph with in-degrees, out-degrees, and cycles',
        },
        {
          uri: 'code-cache://project/sync',
          name: 'Hybrid Sync Status',
          mimeType: 'application/json',
          description: 'Sync cursor, device ID, and offline queue status',
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case 'code-cache://project/overview': {
        const status = core.getStatus();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(status, null, 2) }],
        };
      }
      case 'code-cache://project/status': {
        const status = core.getStatus();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(status, null, 2) }],
        };
      }
      case 'code-cache://project/decisions': {
        const decisions = core.decisionRepo.listByProject(core.config.projectId);
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(decisions, null, 2) }],
        };
      }
      case 'code-cache://project/dependencies': {
        const nodes = core.graph.getNodes();
        const graphData: Record<string, string[]> = {};
        for (const n of nodes) {
          graphData[n] = core.graph.getDependencies(n);
        }
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(graphData, null, 2) }],
        };
      }
      case 'code-cache://project/hot-files': {
        const hotFiles = core.getHotFiles(20);
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(hotFiles, null, 2) }],
        };
      }
      case 'code-cache://project/schema': {
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: 'code-cache SQLite Memory Schema:\nTables: schema_migrations, projects, files, file_versions, analyses, dependencies, sessions, tasks, task_files, decisions, memory_events, ecosystem_manifests, package_dependencies, project_commands, workspace_members, sync_cursors, sync_offline_queue.',
            },
          ],
        };
      }
      case 'code-cache://project/languages': {
        const langs = await core.getLanguages();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(langs, null, 2) }],
        };
      }
      case 'code-cache://project/ecosystems': {
        const eco = await core.getEcosystems();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(eco, null, 2) }],
        };
      }
      case 'code-cache://project/commands': {
        const cmds = core.getProjectCommands();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(cmds, null, 2) }],
        };
      }
      case 'code-cache://project/packages': {
        const pkgs = core.getPackageDependencies();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(pkgs, null, 2) }],
        };
      }
      case 'code-cache://project/workspaces': {
        const ws = core.getWorkspaces();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(ws, null, 2) }],
        };
      }
      case 'code-cache://project/causal-graph': {
        const cg = core.getCausalGraph();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(cg, null, 2) }],
        };
      }
      case 'code-cache://project/sync': {
        const syncStatus = core.getSyncStatus();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(syncStatus, null, 2) }],
        };
      }
      default:
        throw new Error(`Resource not found: ${uri}`);
    }
  });

  return server;
}
