import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RepoMindCore } from '@repomind/core';
import { assertPathContained, defaultLogger } from '@repomind/shared';
import { z } from 'zod';
import path from 'node:path';

export function createMcpServer(core: RepoMindCore): Server {
  const server = new Server(
    {
      name: 'repomind-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // 1. List Available Tools
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
          name: 'get_decisions',
          description: 'Retrieve historical architectural decision records (ADRs) and technical rationale',
          inputSchema: { type: 'object', properties: {} },
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
          name: 'record_session',
          description: 'Record an agent session summary and files modified during the turn',
          inputSchema: {
            type: 'object',
            properties: {
              agentName: { type: 'string', description: 'Agent identifier (e.g. antigravity, cursor)' },
              summary: { type: 'string', description: 'Summary of accomplishments' },
              modifiedFiles: { type: 'array', items: { type: 'string' } },
            },
            required: ['agentName', 'summary'],
          },
        },
        {
          name: 'mark_analysis_stale',
          description: 'Explicitly invalidate a cached file analysis, forcing re-analysis on the next turn',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path of the file' },
            },
            required: ['path'],
          },
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
                    decisionsCount: status.decisionsCount,
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
              content: [{ type: 'text', text: `File "${filePath}" is not indexed in RepoMind.` }],
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
          } else {
            const markdown = core.contextEngine.getContextMarkdown(query, budget);
            return {
              content: [{ type: 'text', text: markdown }],
            };
          }
        }

        case 'get_dependencies': {
          const filePath = String(args?.path || '');
          assertPathContained(filePath, core.projectRoot);
          const details = core.explain(filePath);
          if (!details) {
            return {
              isError: true,
              content: [{ type: 'text', text: `File "${filePath}" is not indexed.` }],
            };
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    upstream: details.dependencies,
                    downstream: details.dependents,
                  },
                  null,
                  2
                ),
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

        case 'record_decision': {
          const title = String(args?.title || '');
          const decision = String(args?.decision || '');
          const rationale = String(args?.rationale || '');
          const affectedFiles = Array.isArray(args?.affectedFiles) ? (args?.affectedFiles as string[]) : [];

          const record = core.decisionRepo.recordDecision({
            projectId: core.config.projectId,
            title,
            decision,
            rationale,
            affectedFiles,
          });

          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, decision: record }, null, 2) }],
          };
        }

        case 'record_session': {
          const agentName = String(args?.agentName || 'unknown');
          const summary = String(args?.summary || '');
          const session = core.sessionRepo.startSession(core.config.projectId, agentName, {
            modifiedFiles: args?.modifiedFiles,
          });
          core.sessionRepo.endSession(session.id, summary);

          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, sessionId: session.id }, null, 2) }],
          };
        }

        case 'mark_analysis_stale': {
          const filePath = String(args?.path || '');
          assertPathContained(filePath, core.projectRoot);
          const files = core.fileRepo.getAllByProject(core.config.projectId);
          const snap = files.get(filePath.replace(/\\/g, '/'));
          if (snap) {
            core.fileRepo.updateStatus(snap.id, 'stale');
            core.analysisRepo.markStaleByFileId(snap.id);
            return {
              content: [{ type: 'text', text: JSON.stringify({ success: true, path: filePath, status: 'stale' }) }],
            };
          }
          return {
            isError: true,
            content: [{ type: 'text', text: `File "${filePath}" was not found.` }],
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

  // 3. Resources Handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'repomind://project/overview',
          name: 'Project Overview',
          mimeType: 'application/json',
          description: 'Summary of registered project metadata and structure',
        },
        {
          uri: 'repomind://project/status',
          name: 'Project Status',
          mimeType: 'application/json',
          description: 'Real-time cache freshness and file indexing stats',
        },
        {
          uri: 'repomind://project/decisions',
          name: 'Architectural Decisions',
          mimeType: 'application/json',
          description: 'All recorded architectural decisions (ADRs)',
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case 'repomind://project/overview': {
        const status = core.getStatus();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(status, null, 2) }],
        };
      }
      case 'repomind://project/status': {
        const status = core.getStatus();
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(status, null, 2) }],
        };
      }
      case 'repomind://project/decisions': {
        const decisions = core.decisionRepo.listByProject(core.config.projectId);
        return {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(decisions, null, 2) }],
        };
      }
      default:
        throw new Error(`Resource not found: ${uri}`);
    }
  });

  return server;
}
