import { TaskContextManifest } from '@code-cache/shared';

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Serializes TaskContextManifest into standard GitHub-flavored Markdown.
 */
export function formatManifestToMarkdown(manifest: TaskContextManifest, projectRoot: string): string {
  const lines: string[] = [];

  lines.push(`# code-cache Context Manifest`);
  lines.push(`**Task Query:** \`${manifest.query}\``);
  lines.push(`**Generated At:** ${manifest.generatedAt}`);
  lines.push(`**Estimated Token Budget Used:** ~${manifest.totalTokensEstimated} tokens`);
  lines.push('');

  // Instructions alert
  lines.push(`> [!IMPORTANT]`);
  lines.push(`> **Safety Protocol:** ${manifest.instructions}`);
  lines.push('');

  if (manifest.warnings.length > 0) {
    lines.push(`> [!WARNING]`);
    for (const w of manifest.warnings) {
      lines.push(`> - ${w}`);
    }
    lines.push('');
  }

  // Relevant Files Table
  lines.push(`## Relevant Files (${manifest.files.length})`);
  lines.push('');
  for (const f of manifest.files) {
    const fullUrl = `file:///${projectRoot.replace(/\\/g, '/')}/${f.relativePath}`;
    const statusBadge = f.status === 'valid' ? '`valid`' : '`stale - needs inspection`';
    lines.push(`### [${f.relativePath}](${fullUrl}) — ${statusBadge}`);
    lines.push(`- **Summary:** ${f.summary}`);
    lines.push(`- **Hash:** \`${f.contentHash.slice(0, 12)}...\``);
    if (f.exports.length > 0) {
      lines.push(`- **Exports:** ${f.exports.map((e) => `\`${e.name}\` (${e.kind})`).join(', ')}`);
    }
    if (f.dependencies.length > 0) {
      lines.push(`- **Dependencies:** ${f.dependencies.map((d) => `\`${d}\``).join(', ')}`);
    }
    if (f.requiresFreshInspection) {
      lines.push(`- **Action:** ⚠️ Stale or modified analysis; inspect physical source file before editing.`);
    }
    lines.push('');
  }

  // Related ADR Decisions
  if (manifest.decisions.length > 0) {
    lines.push(`## Historical Architectural Decisions (${manifest.decisions.length})`);
    for (const d of manifest.decisions) {
      lines.push(`### ${d.title} (${d.createdAt.slice(0, 10)})`);
      lines.push(`- **Decision:** ${d.decision}`);
      lines.push(`- **Rationale:** ${d.rationale}`);
      if (d.affectedFiles.length > 0) {
        lines.push(`- **Affected files:** ${d.affectedFiles.map((f) => `\`${f}\``).join(', ')}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

