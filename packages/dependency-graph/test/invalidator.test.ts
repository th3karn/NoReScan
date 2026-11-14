import { describe, it, expect } from 'vitest';
import { DependencyGraph, ConservativeInvalidator, haveExportsChanged } from '../src/index.js';
import { ExportDefinition } from '@repomind/shared';

describe('Conservative Invalidator (ADR-0003)', () => {
  it('detects export changes accurately', () => {
    const oldExports: ExportDefinition[] = [
      { name: 'login', kind: 'function', signature: 'login(u: string, p: string): boolean' },
    ];
    const unchangedExports: ExportDefinition[] = [
      { name: 'login', kind: 'function', signature: 'login(u: string, p: string): boolean' },
    ];
    const changedExports: ExportDefinition[] = [
      { name: 'login', kind: 'function', signature: 'login(credentials: object): Promise<boolean>' },
    ];

    expect(haveExportsChanged(oldExports, unchangedExports)).toBe(false);
    expect(haveExportsChanged(oldExports, changedExports)).toBe(true);
  });

  it('preserves dependent caches when only private internal implementation changes', () => {
    const graph = new DependencyGraph();
    graph.addEdge('src/auth.controller.ts', 'src/auth.service.ts');

    const invalidator = new ConservativeInvalidator(graph);
    const exports: ExportDefinition[] = [{ name: 'AuthService', kind: 'class' }];

    // Internal code modified, but exported class symbol remains identical
    const decision = invalidator.evaluateImpact('src/auth.service.ts', exports, exports);

    expect(decision.exportsChanged).toBe(false);
    expect(decision.action).toBe('preserve_dependents');
    expect(decision.blastRadius).toEqual(['src/auth.controller.ts']);
  });

  it('invalidates dependents when public interface changes', () => {
    const graph = new DependencyGraph();
    graph.addEdge('src/auth.controller.ts', 'src/auth.service.ts');

    const invalidator = new ConservativeInvalidator(graph);
    const oldExports: ExportDefinition[] = [{ name: 'AuthService', kind: 'class' }];
    const newExports: ExportDefinition[] = [
      { name: 'AuthService', kind: 'class' },
      { name: 'NewHelper', kind: 'function' },
    ];

    const decision = invalidator.evaluateImpact('src/auth.service.ts', oldExports, newExports);

    expect(decision.exportsChanged).toBe(true);
    expect(decision.action).toBe('invalidate_dependents');
    expect(decision.blastRadius).toEqual(['src/auth.controller.ts']);
  });
});
