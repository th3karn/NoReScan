import { DependencyType } from '@code-cache/shared';

export interface GraphEdge {
  source: string; // File path or ID that has the dependency
  target: string; // File path or ID that is depended upon
  type: DependencyType;
  confidence: number;
}

export class DependencyGraph {
  // node -> set of nodes it depends on (outgoing edges)
  private dependencies = new Map<string, Map<string, GraphEdge>>();
  // node -> set of nodes that depend on it (incoming edges)
  private dependents = new Map<string, Map<string, GraphEdge>>();

  public addNode(nodeId: string): void {
    if (!this.dependencies.has(nodeId)) {
      this.dependencies.set(nodeId, new Map());
    }
    if (!this.dependents.has(nodeId)) {
      this.dependents.set(nodeId, new Map());
    }
  }

  public addEdge(source: string, target: string, type: DependencyType = 'import', confidence = 1.0): void {
    this.addNode(source);
    this.addNode(target);

    const edge: GraphEdge = { source, target, type, confidence };
    this.dependencies.get(source)!.set(target, edge);
    this.dependents.get(target)!.set(source, edge);
  }

  public removeNode(nodeId: string): void {
    // Remove outgoing edges
    const deps = this.dependencies.get(nodeId);
    if (deps) {
      for (const target of deps.keys()) {
        this.dependents.get(target)?.delete(nodeId);
      }
    }
    this.dependencies.delete(nodeId);

    // Remove incoming edges
    const dependents = this.dependents.get(nodeId);
    if (dependents) {
      for (const source of dependents.keys()) {
        this.dependencies.get(source)?.delete(nodeId);
      }
    }
    this.dependents.delete(nodeId);
  }

  /**
   * Returns direct dependencies of this node (files it imports).
   */
  public getDirectDependencies(nodeId: string): string[] {
    const map = this.dependencies.get(nodeId);
    return map ? Array.from(map.keys()) : [];
  }

  /**
   * Returns direct dependents of this node (files that import it).
   */
  public getDirectDependents(nodeId: string): string[] {
    const map = this.dependents.get(nodeId);
    return map ? Array.from(map.keys()) : [];
  }

  /**
   * Calculates the full transitive blast radius (all upstream files that depend directly or indirectly on these nodes).
   */
  public calculateBlastRadius(seedNodes: string[], maxDepth = 10): Set<string> {
    const blastRadius = new Set<string>();
    const queue: Array<{ node: string; depth: number }> = seedNodes.map((n) => ({ node: n, depth: 0 }));
    const visited = new Set<string>(seedNodes);

    while (queue.length > 0) {
      const { node, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const directDependents = this.getDirectDependents(node);
      for (const dep of directDependents) {
        blastRadius.add(dep);
        if (!visited.has(dep)) {
          visited.add(dep);
          queue.push({ node: dep, depth: depth + 1 });
        }
      }
    }

    return blastRadius;
  }

  /**
   * Detects circular dependencies within the graph.
   */
  public findCycles(): string[][] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: string[][] = [];
    const path: string[] = [];

    const dfs = (node: string) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = this.getDirectDependencies(node);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          const cycleStartIndex = path.indexOf(neighbor);
          if (cycleStartIndex !== -1) {
            cycles.push([...path.slice(cycleStartIndex), neighbor]);
          }
        }
      }

      path.pop();
      recStack.delete(node);
    };

    for (const node of this.dependencies.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  public getAllNodes(): string[] {
    return Array.from(this.dependencies.keys());
  }

  public getNodes(): string[] {
    return this.getAllNodes();
  }

  public getDependencies(nodeId: string): string[] {
    return this.getDirectDependencies(nodeId);
  }

  public getDependents(nodeId: string): string[] {
    return this.getDirectDependents(nodeId);
  }

  public getBlastRadius(seedNodes: string[], maxDepth = 10): string[] {
    return Array.from(this.calculateBlastRadius(seedNodes, maxDepth));
  }
}

