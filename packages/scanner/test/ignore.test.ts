import { describe, it, expect } from 'vitest';
import { IgnoreEngine } from '../src/ignore.js';

describe('IgnoreEngine', () => {
  it('ignores hardcoded build and dependency paths', () => {
    const engine = new IgnoreEngine();
    expect(engine.ignores('node_modules/express/index.js')).toBe(true);
    expect(engine.ignores('.git/HEAD')).toBe(true);
    expect(engine.ignores('dist/bundle.js')).toBe(true);
    expect(engine.ignores('.turbo/cache')).toBe(true);
    expect(engine.ignores('.bugbrain/bugbrain.db')).toBe(true);
    expect(engine.ignores('.BugBrain/memory.db')).toBe(true);
    expect(engine.ignores('.repomind/memory.db')).toBe(true);
  });

  it('always ignores sensitive files', () => {
    const engine = new IgnoreEngine();
    expect(engine.ignores('.env')).toBe(true);
    expect(engine.ignores('.env.local')).toBe(true);
    expect(engine.ignores('keys/private.pem')).toBe(true);
    expect(engine.ignores('certs/server.key')).toBe(true);
  });

  it('allows normal project source files', () => {
    const engine = new IgnoreEngine();
    expect(engine.ignores('src/index.ts')).toBe(false);
    expect(engine.ignores('package.json')).toBe(false);
    expect(engine.ignores('docs/PRD.md')).toBe(false);
  });
});

