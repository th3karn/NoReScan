import { ExportDefinition } from '@repomind/shared';
import { DependencyGraph } from './graph.js';

export interface InvalidationDecision {
  file: string;
  exportsChanged: boolean;
  blastRadius: string[];
  action: 'invalidate_dependents' | 'preserve_dependents';
}

/**
 * Checks whether the public exported interface of a file has changed.
 */
export function haveExportsChanged(
  previousExports: ExportDefinition[],
  newExports: ExportDefinition[]
): boolean {
  if (previousExports.length !== newExports.length) return true;

  const prevMap = new Map<string, ExportDefinition>();
  for (const e of previousExports) {
    prevMap.set(e.name, e);
  }

  for (const newExp of newExports) {
    const prevExp = prevMap.get(newExp.name);
    if (!prevExp) return true; // New export added or renamed
    if (prevExp.kind !== newExp.kind) return true;
    if (prevExp.signature !== newExp.signature) return true;
  }

  return false;
}

export class ConservativeInvalidator {
  constructor(private graph: DependencyGraph) {}

  /**
   * Evaluates the impact of a modified file on its dependent consumers.
   */
  public evaluateImpact(
    modifiedFile: string,
    previousExports: ExportDefinition[],
    newExports: ExportDefinition[]
  ): InvalidationDecision {
    const exportsChanged = haveExportsChanged(previousExports, newExports);
    const directDependents = this.graph.getDirectDependents(modifiedFile);

    if (exportsChanged) {
      // Public contract broke -> invalidate dependents
      return {
        file: modifiedFile,
        exportsChanged: true,
        blastRadius: directDependents,
        action: 'invalidate_dependents',
      };
    }

    // Only internal logic changed -> preserve dependent structural cache
    return {
      file: modifiedFile,
      exportsChanged: false,
      blastRadius: directDependents,
      action: 'preserve_dependents',
    };
  }
}
