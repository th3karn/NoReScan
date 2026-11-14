import { describe, it, expect } from 'vitest';
import { CodeAnalyzer } from '../src/index.js';

describe('CodeAnalyzer', () => {
  const analyzer = new CodeAnalyzer();

  it('analyzes TypeScript code and extracts exports, imports, and routes', () => {
    const code = `
      import { Router, Request, Response } from 'express';
      import { AuthService } from './auth.service.js';

      export interface UserPayload {
        id: string;
        email: string;
      }

      export class AuthController {
        private service: AuthService;
      }

      export function validateToken(token: string): boolean {
        return token.length > 10;
      }

      const router = Router();
      router.post('/login', (req, res) => res.send('ok'));
    `;

    const result = analyzer.analyzeSource(code, 'src/auth.controller.ts', 'typescript');

    expect(result.analyzerVersion).toBe('1.0.0');
    expect(result.schemaVersion).toBe(1);

    const exports = result.astMetadata.exports.map((e) => e.name);
    expect(exports).toContain('UserPayload');
    expect(exports).toContain('AuthController');
    expect(exports).toContain('validateToken');

    const imports = result.astMetadata.imports;
    expect(imports).toHaveLength(2);
    expect(imports[0].source).toBe('express');
    expect(imports[0].specifiers).toContain('Router');

    const routes = result.astMetadata.routes;
    expect(routes).toBeDefined();
    expect(routes?.[0].method).toBe('POST');
    expect(routes?.[0].path).toBe('/login');
    expect(result.summary).toContain('POST /login');
  });

  it('analyzes Python code and extracts classes, functions, and FastAPI routes', () => {
    const code = `
from fastapi import FastAPI, Depends
from models import Item

app = FastAPI()

class OrderService:
    def process(self):
        pass

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {"item_id": item_id}
`;

    const result = analyzer.analyzeSource(code, 'app/main.py', 'python');

    const exports = result.astMetadata.exports.map((e) => e.name);
    expect(exports).toContain('OrderService');
    expect(exports).toContain('read_item');

    const routes = result.astMetadata.routes;
    expect(routes).toBeDefined();
    expect(routes?.[0].method).toBe('GET');
    expect(routes?.[0].path).toBe('/items/{item_id}');
  });

  it('analyzes SQL schema and extracts table models', () => {
    const code = `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `;

    const result = analyzer.analyzeSource(code, 'schema.sql', 'sql');

    expect(result.astMetadata.models).toHaveLength(1);
    expect(result.astMetadata.models?.[0].name).toBe('users');
    expect(result.astMetadata.models?.[0].fields.map((f) => f.name)).toContain('email');
    expect(result.summary).toContain('Database tables: users');
  });

  it('analyzes JSON configuration files', () => {
    const json = JSON.stringify({ name: 'code-cache', version: '0.1.0', private: true });
    const result = analyzer.analyzeSource(json, 'package.json', 'json');

    expect(result.summary).toContain('JSON configuration with keys: name, version, private');
  });
});

