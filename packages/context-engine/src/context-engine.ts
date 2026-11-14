import {
  FileRepository,
  AnalysisRepository,
  DependencyRepository,
  DecisionRepository,
  ProjectRepository,
} from '@code-cache/database';
import { DependencyGraph } from '@code-cache/dependency-graph';
import { TaskContextManifest } from '@code-cache/shared';
import { extractQueryTokens } from './tokenizer.js';
import { scoreFileRelevance, scoreDecisionRelevance } from './scorer.js';
import { formatManifestToMarkdown, estimateTokenCount } from './budgeter.js';

export interface ContextEngineOptions {
  projectId: string;
  projectRoot: string;
  fileRepo: FileRepository;
  analysisRepo: AnalysisRepository;
  depRepo: DependencyRepository;
  decisionRepo: DecisionRepository;
  projectRepo?: ProjectRepository;
  graph?: DependencyGraph;
}

export class TaskContextEngine {
  constructor(private options: ContextEngineOptions) { }

  public getContext(query: string, tokenBudget = 8000): TaskContextManifest {
    const tokens = extractQueryTokens(query);
    const files = this.options.fileRepo.getAllByProject(this.options.projectId);
    const decisions = this.options.decisionRepo.listByProject(this.options.projectId);

    // 1. Score all files
    const scoredFiles = [];
    for (const file of files.values()) {
      if (file.status === 'deleted') continue;
      const analysis = this.options.analysisRepo.getLatestByFileId(file.id);
      const scored = scoreFileRelevance(file, analysis || undefined, tokens);
      if (scored.score > 0) {
        scoredFiles.push(scored);
      }
    }

    // Sort descending by relevance score
    scoredFiles.sort((a, b) => b.score - a.score);

    // 2. Score decisions
    const scoredDecisions = decisions
      .map((d) => scoreDecisionRelevance(d, tokens))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.decision);

    // 3. Assemble and pack within token budget
    const manifestFiles: TaskContextManifest['files'] = [];
    const warnings: string[] = [];
    let approximateCharacters = 0;
    const maxCharacters = tokenBudget * 4;

    for (const item of scoredFiles) {
      const deps = this.options.depRepo
        .getUpstreamDependencies(item.file.id)
        .map((d) => d.targetPath);

      const isStale: boolean = item.file.status !== 'valid' || (item.analysis !== undefined && item.analysis.status !== 'valid');
      if (isStale) {
        warnings.push(`File ${item.file.relativePath} is stale or requires re-analysis.`);
      }

      const fileEntry = {
        relativePath: item.file.relativePath,
        contentHash: item.file.contentHash,
        language: item.file.language,
        status: item.file.status,
        summary: item.analysis?.summary || 'Not yet analyzed',
        relevanceScore: item.score,
        exports: item.analysis?.astMetadata.exports || [],
        dependencies: deps,
        requiresFreshInspection: isStale,
      };

      const entrySize = JSON.stringify(fileEntry).length;
      if (approximateCharacters + entrySize > maxCharacters && manifestFiles.length > 0) {
        warnings.push(`Context budget reached. Truncated remaining files.`);
        break;
      }

      approximateCharacters += entrySize;
      manifestFiles.push(fileEntry);
    }

    const estimatedTokens = estimateTokenCount(JSON.stringify(manifestFiles) + JSON.stringify(scoredDecisions));

    return {
      projectId: this.options.projectId,
      query,
      generatedAt: new Date().toISOString(),
      totalTokensEstimated: estimatedTokens,
      files: manifestFiles,
      decisions: scoredDecisions.slice(0, 5),
      warnings,
      instructions:
        'Always read physical source files before writing modifications. code-cache provides verified structure to avoid redundant full-repo scans, but never substitute cached summaries for direct source inspection.',
    };
  }

  public getContextMarkdown(query: string, tokenBudget = 8000): string {
    const manifest = this.getContext(query, tokenBudget);
    return formatManifestToMarkdown(manifest, this.options.projectRoot);
  }
}
