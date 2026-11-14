import { DependencyGraph } from '@bugbrain/dependency-graph';

export interface GraphNode {
  id: string; // relativePath
  label: string; // basename
  inDegree: number; // dependent count (how many files import this)
  outDegree: number; // dependency count (how many files this imports)
  isHot: boolean; // load-bearing file
  isSeed?: boolean; // modified file in diff
  isBlastCone?: boolean; // affected upstream file
  blastDepth?: number; // distance in blast cone
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  isBlastPath?: boolean;
}

export interface CausalGraphData {
  stats: {
    totalFiles: number;
    totalEdges: number;
    hotFilesCount: number;
    density: number;
    cyclesCount: number;
  };
  hotFiles: Array<{ relativePath: string; inDegree: number; outDegree: number }>;
  nodes: GraphNode[];
  edges: GraphLink[];
  cycles: string[][];
}

export interface BlastRadiusResult {
  seedFiles: string[];
  blastCone: string[];
  blastConeByDepth: Record<number, string[]>;
  totalAffected: number;
  diffSummary?: {
    filesChanged: number;
    additions?: number;
    deletions?: number;
  };
}

export class Cartographer {
  private graph: DependencyGraph;

  constructor(graph: DependencyGraph) {
    this.graph = graph;
  }

  /**
   * Parses git diff or unified diff text to extract changed file paths.
   */
  public parseDiff(diffText: string): string[] {
    const changedFiles = new Set<string>();
    const lines = diffText.split('\n');

    for (const line of lines) {
      // Matches: diff --git a/src/auth.ts b/src/auth.ts
      const gitDiffMatch = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
      if (gitDiffMatch) {
        changedFiles.add(gitDiffMatch[2].trim());
        continue;
      }

      // Matches: +++ b/src/auth.ts
      const plusMatch = line.match(/^\+\+\+ b\/(.+?)$/);
      if (plusMatch && plusMatch[1] !== '/dev/null') {
        changedFiles.add(plusMatch[1].trim());
        continue;
      }

      // Matches: --- a/src/auth.ts
      const minusMatch = line.match(/^--- a\/(.+?)$/);
      if (minusMatch && minusMatch[1] !== '/dev/null') {
        changedFiles.add(minusMatch[1].trim());
      }
    }

    return Array.from(changedFiles);
  }

  /**
   * Computes the complete Causal Graph data model with hot files and cycle detection.
   */
  public getCausalGraph(hotThreshold = 1): CausalGraphData {
    const allNodes = this.graph.getAllNodes();
    const nodes: GraphNode[] = [];
    const edges: GraphLink[] = [];
    const hotFiles: Array<{ relativePath: string; inDegree: number; outDegree: number }> = [];

    let totalEdges = 0;

    for (const node of allNodes) {
      const dependents = this.graph.getDirectDependents(node);
      const dependencies = this.graph.getDirectDependencies(node);

      const inDegree = dependents.length;
      const outDegree = dependencies.length;
      const isHot = inDegree >= hotThreshold && inDegree > 0;

      nodes.push({
        id: node,
        label: node.split(/[\/\\]/).pop() || node,
        inDegree,
        outDegree,
        isHot,
      });

      if (isHot) {
        hotFiles.push({ relativePath: node, inDegree, outDegree });
      }

      for (const dep of dependencies) {
        totalEdges++;
        edges.push({
          source: node,
          target: dep,
          type: 'import',
        });
      }
    }

    // Sort hot files descending by inDegree
    hotFiles.sort((a, b) => b.inDegree - a.inDegree);

    const cycles = this.graph.findCycles();
    const totalFiles = allNodes.length;
    const maxPossibleEdges = totalFiles * (totalFiles - 1);
    const density = maxPossibleEdges > 0 ? Math.round((totalEdges / maxPossibleEdges) * 1000) / 1000 : 0;

    return {
      stats: {
        totalFiles,
        totalEdges,
        hotFilesCount: hotFiles.length,
        density,
        cyclesCount: cycles.length,
      },
      hotFiles,
      nodes,
      edges,
      cycles,
    };
  }

  /**
   * Calculates the upstream blast cone (files that would break if seed files are modified).
   */
  public calculateBlastRadius(seedFiles: string[], maxDepth = 10): BlastRadiusResult {
    const blastConeByDepth: Record<number, string[]> = {};
    const allBlastCone = new Set<string>();
    const queue: Array<{ file: string; depth: number }> = [];
    const visited = new Set<string>();

    for (const seed of seedFiles) {
      queue.push({ file: seed, depth: 0 });
      visited.add(seed);
    }

    while (queue.length > 0) {
      const { file, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const directDependents = this.graph.getDirectDependents(file);
      for (const dep of directDependents) {
        if (!visited.has(dep)) {
          visited.add(dep);
          allBlastCone.add(dep);

          const nextDepth = depth + 1;
          if (!blastConeByDepth[nextDepth]) {
            blastConeByDepth[nextDepth] = [];
          }
          blastConeByDepth[nextDepth].push(dep);
          queue.push({ file: dep, depth: nextDepth });
        }
      }
    }

    return {
      seedFiles,
      blastCone: Array.from(allBlastCone),
      blastConeByDepth,
      totalAffected: allBlastCone.size,
    };
  }

  /**
   * Blasts a git diff and calculates the affected upstream cone of files.
   */
  public blastDiff(diffText: string, maxDepth = 10): BlastRadiusResult {
    const seedFiles = this.parseDiff(diffText);
    const result = this.calculateBlastRadius(seedFiles, maxDepth);
    result.diffSummary = {
      filesChanged: seedFiles.length,
    };
    return result;
  }

  /**
   * Renders the causal graph in Mermaid flowchart syntax.
   */
  public toMermaid(): string {
    const lines = ['flowchart TD'];
    const graphData = this.getCausalGraph();

    for (const node of graphData.nodes) {
      const safeId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
      if (node.isHot) {
        lines.push(`  ${safeId}["🔥 ${node.label} (in: ${node.inDegree})"]:::hotNode`);
      } else {
        lines.push(`  ${safeId}["${node.label}"]`);
      }
    }

    for (const edge of graphData.edges) {
      const sourceId = edge.source.replace(/[^a-zA-Z0-9_]/g, '_');
      const targetId = edge.target.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`  ${sourceId} --> ${targetId}`);
    }

    lines.push('  classDef hotNode fill:#0d9488,stroke:#14b8a6,stroke-width:2px,color:#fff;');
    return lines.join('\n');
  }

  /**
   * Renders the causal graph in Graphviz DOT format.
   */
  public toDot(): string {
    const lines = ['digraph BugBrainCausalGraph {', '  rankdir=LR;', '  node [shape=box, style="rounded,filled", fillcolor="#1e293b", fontcolor="#f8fafc", fontname="sans-serif"];', '  edge [color="#64748b"];'];
    const graphData = this.getCausalGraph();

    for (const node of graphData.nodes) {
      const color = node.isHot ? '#0f766e' : '#1e293b';
      const border = node.isHot ? '#14b8a6' : '#475569';
      lines.push(`  "${node.id}" [label="${node.label}\\n(in: ${node.inDegree})", fillcolor="${color}", color="${border}"];`);
    }

    for (const edge of graphData.edges) {
      lines.push(`  "${edge.source}" -> "${edge.target}";`);
    }

    lines.push('}');
    return lines.join('\n');
  }
}
