import { describe, it, expect } from 'vitest';
import { DependencyGraph, resolveImportSpecifier } from '../src/index.js';

describe('DependencyGraph', () => {
  it('manages direct dependencies and dependents', () => {
    const graph = new DependencyGraph();
    // A imports B, B imports C
    graph.addEdge('src/A.ts', 'src/B.ts');
    graph.addEdge('src/B.ts', 'src/C.ts');

    expect(graph.getDirectDependencies('src/A.ts')).toEqual(['src/B.ts']);
    expect(graph.getDirectDependents('src/C.ts')).toEqual(['src/B.ts']);
    expect(graph.getDirectDependents('src/B.ts')).toEqual(['src/A.ts']);
  });

  it('calculates transitive blast radius', () => {
    const graph = new DependencyGraph();
    // A -> B -> C -> D
    graph.addEdge('src/A.ts', 'src/B.ts');
    graph.addEdge('src/B.ts', 'src/C.ts');
    graph.addEdge('src/C.ts', 'src/D.ts');

    // If D changes, blast radius is C, B, A
    const blastRadius = graph.calculateBlastRadius(['src/D.ts']);
    expect(Array.from(blastRadius).sort()).toEqual(['src/A.ts', 'src/B.ts', 'src/C.ts']);
  });

  it('detects circular dependencies without infinite loops', () => {
    const graph = new DependencyGraph();
    // Circular: A -> B -> C -> A
    graph.addEdge('src/A.ts', 'src/B.ts');
    graph.addEdge('src/B.ts', 'src/C.ts');
    graph.addEdge('src/C.ts', 'src/A.ts');

    const cycles = graph.findCycles();
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]).toContain('src/A.ts');
    expect(cycles[0]).toContain('src/B.ts');
    expect(cycles[0]).toContain('src/C.ts');
  });

  it('resolves relative import specifiers against known project paths', () => {
    const known = new Set(['src/auth/service.ts', 'src/auth/controller.ts', 'src/utils/index.ts']);

    expect(resolveImportSpecifier('./service.js', 'src/auth/controller.ts', known)).toBe('src/auth/service.ts');
    expect(resolveImportSpecifier('../utils', 'src/auth/controller.ts', known)).toBe('src/utils/index.ts');
    expect(resolveImportSpecifier('express', 'src/auth/controller.ts', known)).toBeNull();
  });
});

