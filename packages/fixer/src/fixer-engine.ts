import fs from 'node:fs/promises';
import path from 'node:path';
import { NoReScanCore } from '@norescan/core';
import { normalizePath } from '@norescan/shared';
import { DiagnosticError } from './error-parser.js';

export interface FixProposal {
  filePath: string;
  originalText: string;
  replacementText: string;
  reason: string;
  confidence: number;
}

export interface FixResult {
  diagnosedErrors: number;
  proposals: FixProposal[];
  appliedCount: number;
  affectedBlastRadius: string[];
}

export class FixerEngine {
  constructor(private core: NoReScanCore) {}

  /**
   * Analyzes diagnostic errors against NoReScan memory and dependency graph,
   * producing fix proposals.
   */
  public async diagnose(errors: DiagnosticError[]): Promise<FixProposal[]> {
    const proposals: FixProposal[] = [];

    for (const err of errors) {
      if (!err.filePath) continue;

      const normalized = normalizePath(err.filePath);
      const absPath = path.isAbsolute(normalized)
        ? normalized
        : path.join(this.core.projectRoot, normalized);

      let content = '';
      try {
        content = await fs.readFile(absPath, 'utf8');
      } catch {
        continue;
      }

      // Rule 1: Typo in scope import (e.g. @norescanhared -> @norescan/shared)
      const typoMatch = content.match(/@norescan([a-z]+)/);
      if (typoMatch) {
        let pkgName = typoMatch[1];
        if (pkgName === 'hared') pkgName = 'shared';
        proposals.push({
          filePath: normalized,
          originalText: typoMatch[0],
          replacementText: `@norescan/${pkgName}`,
          reason: `Fixed missing slash in scoped import ${typoMatch[0]}`,
          confidence: 0.95,
        });
      }

      // Rule 2: Legacy package imports (@bugbrain/* or @code-cache/*)
      const legacyScopeMatch = content.match(/@(bugbrain|code-cache)\/([a-zA-Z0-9_\-]+)/);
      if (legacyScopeMatch) {
        proposals.push({
          filePath: normalized,
          originalText: legacyScopeMatch[0],
          replacementText: `@norescan/${legacyScopeMatch[2]}`,
          reason: `Migrated legacy import ${legacyScopeMatch[0]} to @norescan/${legacyScopeMatch[2]}`,
          confidence: 0.99,
        });
      }

      // Rule 3: Hyphenated unquoted object keys (e.g. code- cache: -> 'code-cache':)
      const hyphenKeyMatch = content.match(/([a-zA-Z0-9]+)\s*-\s*([a-zA-Z0-9]+)\s*:\s*\{/);
      if (hyphenKeyMatch) {
        proposals.push({
          filePath: normalized,
          originalText: hyphenKeyMatch[0],
          replacementText: `'${hyphenKeyMatch[1]}-${hyphenKeyMatch[2]}': {`,
          reason: `Quoted hyphenated object key ${hyphenKeyMatch[1]}-${hyphenKeyMatch[2]}`,
          confidence: 0.90,
        });
      }

      // Rule 4: Renamed legacy client (CodeCacheClient -> NoReScanClient)
      if (content.includes('CodeCacheClient')) {
        proposals.push({
          filePath: normalized,
          originalText: 'CodeCacheClient',
          replacementText: 'NoReScanClient',
          reason: 'Updated legacy CodeCacheClient to NoReScanClient',
          confidence: 0.95,
        });
      }

      // Rule 5: Renamed legacy core class (CodeCacheCore -> NoReScanCore)
      if (content.includes('CodeCacheCore')) {
        proposals.push({
          filePath: normalized,
          originalText: 'CodeCacheCore',
          replacementText: 'NoReScanCore',
          reason: 'Updated legacy CodeCacheCore to NoReScanCore',
          confidence: 0.95,
        });
      }
    }

    // Deduplicate proposals
    const unique = new Map<string, FixProposal>();
    for (const p of proposals) {
      const key = `${p.filePath}:${p.originalText}`;
      if (!unique.has(key) || unique.get(key)!.confidence < p.confidence) {
        unique.set(key, p);
      }
    }

    return Array.from(unique.values());
  }

  /**
   * Applies the proposed fixes directly to source files on physical disk.
   */
  public async applyFixes(proposals: FixProposal[]): Promise<number> {
    let applied = 0;
    const filesToTouch = new Set<string>();

    for (const p of proposals) {
      const absPath = path.isAbsolute(p.filePath)
        ? p.filePath
        : path.join(this.core.projectRoot, p.filePath);

      try {
        const content = await fs.readFile(absPath, 'utf8');
        if (content.includes(p.originalText)) {
          const updated = content.replaceAll(p.originalText, p.replacementText);
          await fs.writeFile(absPath, updated, 'utf8');
          applied++;
          filesToTouch.add(p.filePath);
        }
      } catch {
        // Skip unwriteable files
      }
    }

    // Immediately refresh NoReScan's memory for modified files so cache is fresh
    for (const file of filesToTouch) {
      try {
        await this.core.refreshFile(file);
      } catch {
        // non-fatal
      }
    }

    return applied;
  }

  /**
   * Calculates the overall blast radius cone across all diagnosed files.
   */
  public getBlastRadius(proposals: FixProposal[]): string[] {
    const seedFiles = Array.from(new Set(proposals.map((p) => p.filePath)));
    return this.core.cartographer.calculateBlastRadius(seedFiles).blastCone;
  }
}
