import fs from 'node:fs/promises';
import { parseTypeScript } from './parsers/typescript.js';
import { parsePython } from './parsers/python.js';
import { parseSql } from './parsers/sql.js';
import { parseGeneric } from './parsers/generic.js';
import { AstMetadata } from '@bugbrain/shared';

export const CURRENT_ANALYZER_VERSION = '1.0.0';
export const CURRENT_SCHEMA_VERSION = 1;

export interface AnalysisOutput {
  summary: string;
  astMetadata: AstMetadata;
  analyzerVersion: string;
  schemaVersion: number;
}

export class CodeAnalyzer {
  public async analyzeFile(absolutePath: string, relativePath: string, language: string): Promise<AnalysisOutput> {
    const content = await fs.readFile(absolutePath, 'utf8');
    return this.analyzeSource(content, relativePath, language);
  }

  public analyzeSource(sourceText: string, relativePath: string, language: string): AnalysisOutput {
    let result: { metadata: AstMetadata; summary: string };

    switch (language) {
      case 'typescript':
      case 'javascript':
        result = parseTypeScript(sourceText, relativePath);
        break;
      case 'python':
        result = parsePython(sourceText, relativePath);
        break;
      case 'sql':
        result = parseSql(sourceText, relativePath);
        break;
      default:
        result = parseGeneric(sourceText, relativePath, language);
        break;
    }

    return {
      summary: result.summary,
      astMetadata: result.metadata,
      analyzerVersion: CURRENT_ANALYZER_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
  }
}

