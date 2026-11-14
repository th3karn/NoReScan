import { AstMetadata, ExportDefinition, ImportDefinition, RouteDefinition, SymbolDefinition } from '@bugbrain/shared';

export function parsePython(sourceText: string, fileName: string): { metadata: AstMetadata; summary: string } {
  const lines = sourceText.split(/\r?\n/);
  const imports: ImportDefinition[] = [];
  const exports: ExportDefinition[] = [];
  const symbols: SymbolDefinition[] = [];
  const routes: RouteDefinition[] = [];

  let pendingDecorator: { method: string; path: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // 1. Imports
    // e.g. import os, sys
    if (line.startsWith('import ')) {
      const parts = line.slice(7).split(',').map((p) => p.trim());
      for (const p of parts) {
        imports.push({ source: p, specifiers: [p], isDynamic: false, isTypeOnly: false });
      }
    }
    // e.g. from fastapi import FastAPI, Depends
    if (line.startsWith('from ')) {
      const match = line.match(/^from\s+([\w\.]+)\s+import\s+(.+)$/);
      if (match) {
        const source = match[1];
        const specifiers = match[2].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]);
        imports.push({ source, specifiers, isDynamic: false, isTypeOnly: false });
      }
    }

    // 2. Route decorators (FastAPI/Flask)
    // e.g. @app.get("/users") or @router.post('/login')
    const routeMatch = line.match(/^@(?:app|router)\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']/i);
    if (routeMatch) {
      pendingDecorator = {
        method: routeMatch[1].toUpperCase(),
        path: routeMatch[2],
      };
    }

    // 3. Classes
    // e.g. class User(BaseModel):
    const classMatch = line.match(/^class\s+([A-Za-z0-9_]+)(?:\(([^)]+)\))?:/);
    if (classMatch) {
      const name = classMatch[1];
      symbols.push({ name, kind: 'class', line: lineNum, exported: !name.startsWith('_') });
      if (!name.startsWith('_')) {
        exports.push({ name, kind: 'class' });
      }
    }

    // 4. Functions / async functions
    // e.g. def get_user(id: int):
    const funcMatch = line.match(/^(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
    if (funcMatch) {
      const name = funcMatch[1];
      const isPublic = !name.startsWith('_');
      symbols.push({ name, kind: 'function', line: lineNum, exported: isPublic });
      if (isPublic) {
        exports.push({ name, kind: 'function', signature: funcMatch[0] });
      }
      if (pendingDecorator) {
        routes.push({
          method: pendingDecorator.method as RouteDefinition['method'],
          path: pendingDecorator.path,
          handler: name,
        });
        pendingDecorator = null;
      }
    }
  }

  const parts: string[] = [];
  if (routes.length > 0) parts.push(`Routes: ${routes.map((r) => `${r.method} ${r.path}`).join(', ')}`);
  if (exports.length > 0) parts.push(`Exports: ${exports.map((e) => `${e.kind} ${e.name}`).join(', ')}`);
  if (imports.length > 0) parts.push(`Imports: ${imports.length} modules`);
  const summary = parts.length > 0 ? parts.join(' | ') : `Python module ${fileName}`;

  return {
    metadata: {
      symbols,
      imports,
      exports,
      routes: routes.length > 0 ? routes : undefined,
    },
    summary,
  };
}

