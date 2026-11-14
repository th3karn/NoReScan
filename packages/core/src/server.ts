import http from 'node:http';
import { CodeCacheCore } from './core.js';
import { Cartographer } from './cartographer.js';
import { renderDashboardHtml } from './dashboard.js';
import { defaultLogger } from '@code-cache/shared';

export interface ServerOptions {
  port?: number;
  host?: string;
}

export class CodeCacheRestServer {
  private core: CodeCacheCore;
  private server: http.Server | null = null;
  private cartographer: Cartographer;

  constructor(core: CodeCacheCore) {
    this.core = core;
    this.cartographer = new Cartographer((core as any).graph);
  }

  public async start(options: ServerOptions = {}): Promise < { port: number; host: string; url: string } > {
    const port = options.port || 31415;
    const host = options.host || '127.0.0.1';

    await this.core.loadConfig();

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = new URL(req.url || '/', `http://${host}:${port}`);
        const pathname = url.pathname;

        const sendJson = (status: number, data: unknown) => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data, null, 2));
        };

        const readBodyJson = (): Promise<any> => {
          return new Promise((resolveBody, rejectBody) => {
            let body = '';
            req.on('data', (chunk) => (body += chunk));
            req.on('end', () => {
              try {
                resolveBody(body ? JSON.parse(body) : {});
              } catch (e) {
                rejectBody(e);
              }
            });
            req.on('error', rejectBody);
          });
        };

        try {
          // 1. Health check
          if (pathname === '/health' && req.method === 'GET') {
            return sendJson(200, { status: 'healthy', timestamp: new Date().toISOString() });
          }

          // 2. Interactive Cartographer Dashboard UI (HTML)
          if ((pathname === '/' || pathname === '/dashboard') && req.method === 'GET') {
            const graphData = this.cartographer.getCausalGraph();
            const html = renderDashboardHtml(this.core.config?.projectName || 'Project', graphData);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
          }

          // 3. Project status
          if (pathname === '/api/v1/status' && req.method === 'GET') {
            return sendJson(200, this.core.getStatus());
          }

          // 4. Causal Graph
          if (pathname === '/api/v1/graph' && req.method === 'GET') {
            return sendJson(200, this.cartographer.getCausalGraph());
          }

          // 5. Hot Files (load-bearing files)
          if (pathname === '/api/v1/hot-files' && req.method === 'GET') {
            return sendJson(200, this.core.getHotFiles());
          }

          // 6. Blast Radius (CI/CD endpoint)
          if (pathname === '/api/v1/blast-radius' && req.method === 'POST') {
            const body = await readBodyJson();
            if (body.diff) {
              const result = this.cartographer.blastDiff(body.diff, body.maxDepth || 10);
              return sendJson(200, result);
            } else if (body.files && Array.isArray(body.files)) {
              const result = this.cartographer.calculateBlastRadius(body.files, body.maxDepth || 10);
              return sendJson(200, result);
            } else {
              return sendJson(400, { error: 'Must provide either "files" array or "diff" string.' });
            }
          }

          // 7. Languages
          if (pathname === '/api/v1/languages' && req.method === 'GET') {
            const langs = await this.core.getLanguages();
            return sendJson(200, langs);
          }

          // 8. Ecosystems
          if (pathname === '/api/v1/ecosystems' && req.method === 'GET') {
            const eco = await this.core.getEcosystems();
            return sendJson(200, eco);
          }

          // 9. Packages
          if (pathname === '/api/v1/packages' && req.method === 'GET') {
            const pkgs = this.core.getPackageDependencies();
            return sendJson(200, pkgs);
          }

          // 10. Commands
          if (pathname === '/api/v1/commands' && req.method === 'GET') {
            const category = url.searchParams.get('category') || undefined;
            const cmds = this.core.getProjectCommands(category);
            return sendJson(200, cmds);
          }

          // 11. Safe Command Run
          if (pathname === '/api/v1/run' && req.method === 'POST') {
            const body = await readBodyJson();
            if (!body.command) {
              return sendJson(400, { error: 'Missing "command" field' });
            }
            const resRun = await this.core.executeCommand(body.command);
            return sendJson(resRun.success ? 200 : 403, resRun);
          }

          // 12. Decisions (ADRs)
          if (pathname === '/api/v1/decisions') {
            if (req.method === 'GET') {
              return sendJson(200, this.core.getDecisions());
            } else if (req.method === 'POST') {
              const body = await readBodyJson();
              const adr = this.core.recordDecision(body);
              return sendJson(201, adr);
            }
          }

          // 13. Sync status and endpoints
          if (pathname === '/api/v1/sync/status' && req.method === 'GET') {
            const syncStatus = (this.core as any).syncEngine?.getStatus();
            return sendJson(200, syncStatus || { status: 'unconfigured' });
          }

          // Route not found
          return sendJson(404, { error: 'Route not found', path: pathname });
        } catch (err: any) {
          defaultLogger.error('API Server error:', err);
          return sendJson(500, { error: err.message });
        }
      });

      this.server.listen(port, host, () => {
        resolve({
          port,
          host,
          url: `http://${host}:${port}`,
        });
      });

      this.server.on('error', reject);
    });
  }

  public stop(): Promise < void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

