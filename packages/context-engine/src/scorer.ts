import { FileSnapshot, FileAnalysis, DecisionRecord } from '@bugbrain/shared';

export interface ScoredFile {
  file: FileSnapshot;
  analysis?: FileAnalysis;
  score: number;
  matchedReasons: string[];
}

function matchesToken(text: string, token: string): boolean {
  if (text.includes(token)) return true;
  // Handle root stems (e.g. auth / authentication, token / tokens, config / configuration)
  if (token.length >= 4) {
    const stem = token.slice(0, 4);
    if (text.includes(stem)) return true;
  }
  return false;
}

export function scoreFileRelevance(
  file: FileSnapshot,
  analysis: FileAnalysis | undefined,
  tokens: string[]
): ScoredFile {
  let score = 0;
  const matchedReasons: string[] = [];

  const lowerPath = file.relativePath.toLowerCase();

  // 1. Path Match (Weight: 3.5 per match)
  for (const token of tokens) {
    if (matchesToken(lowerPath, token)) {
      score += 3.5;
      matchedReasons.push(`Path matches "${token}"`);
    }
  }

  // 2. Symbols and Exports Match (Weight: 3.0 per match)
  if (analysis) {
    for (const exp of analysis.astMetadata.exports) {
      const lowerExp = exp.name.toLowerCase();
      for (const token of tokens) {
        if (matchesToken(lowerExp, token)) {
          score += 3.0;
          matchedReasons.push(`Export "${exp.name}" matches "${token}"`);
        }
      }
    }

    for (const sym of analysis.astMetadata.symbols) {
      const lowerSym = sym.name.toLowerCase();
      for (const token of tokens) {
        if (matchesToken(lowerSym, token)) {
          score += 1.5;
        }
      }
    }

    // 3. Routes Match (Weight: 4.0 for matching route endpoints)
    if (analysis.astMetadata.routes) {
      for (const r of analysis.astMetadata.routes) {
        const lowerRoute = r.path.toLowerCase();
        for (const token of tokens) {
          if (matchesToken(lowerRoute, token)) {
            score += 4.0;
            matchedReasons.push(`Route ${r.method} ${r.path} matches "${token}"`);
          }
        }
      }
    }

    // 4. Summary Match (Weight: 1.0)
    const lowerSummary = analysis.summary.toLowerCase();
    for (const token of tokens) {
      if (matchesToken(lowerSummary, token)) {
        score += 1.0;
      }
    }
  }

  return { file, analysis, score, matchedReasons };
}

export function scoreDecisionRelevance(
  decision: DecisionRecord,
  tokens: string[]
): { decision: DecisionRecord; score: number } {
  let score = 0;
  const text = `${decision.title} ${decision.rationale} ${decision.decision} ${decision.affectedFiles.join(' ')}`.toLowerCase();

  for (const token of tokens) {
    if (matchesToken(text, token)) {
      score += 2.0;
    }
  }

  return { decision, score };
}
