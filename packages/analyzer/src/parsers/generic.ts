import { AstMetadata, SymbolDefinition, ExportDefinition } from '@norescan/shared';

export function parseGeneric(sourceText: string, fileName: string, language: string): { metadata: AstMetadata; summary: string } {
  const symbols: SymbolDefinition[] = [];
  const exports: ExportDefinition[] = [];

  // JSON files
  if (language === 'json') {
    try {
      const parsed = JSON.parse(sourceText);
      const keys = Object.keys(parsed).slice(0, 10);
      return {
        metadata: {
          symbols: keys.map((k) => ({ name: k, kind: 'property', line: 1, exported: true })),
          imports: [],
          exports: keys.map((k) => ({ name: k, kind: 'variable' })),
        },
        summary: `JSON configuration with keys: ${keys.join(', ')}`,
      };
    } catch {
      return { metadata: { symbols: [], imports: [], exports: [] }, summary: `JSON file ${fileName}` };
    }
  }

  // Go / Rust / Java symbol regex matching
  const lines = sourceText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Go: func (r *Receiver) Name(...) or func Name(...)
    if (language === 'go') {
      const funcMatch = line.match(/^func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)\s*\(/);
      if (funcMatch) {
        const name = funcMatch[1];
        const isExported = /^[A-Z]/.test(name);
        symbols.push({ name, kind: 'function', line: lineNum, exported: isExported });
        if (isExported) exports.push({ name, kind: 'function' });
      }
      const typeMatch = line.match(/^type\s+([A-Za-z0-9_]+)\s+(?:struct|interface)/);
      if (typeMatch) {
        const name = typeMatch[1];
        const isExported = /^[A-Z]/.test(name);
        symbols.push({ name, kind: 'type', line: lineNum, exported: isExported });
        if (isExported) exports.push({ name, kind: 'type' });
      }
    }

    // Rust: pub fn name(...) or fn name(...)
    if (language === 'rust') {
      const fnMatch = line.match(/^(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)\s*\(/);
      if (fnMatch) {
        const name = fnMatch[1];
        const isExported = line.startsWith('pub ');
        symbols.push({ name, kind: 'function', line: lineNum, exported: isExported });
        if (isExported) exports.push({ name, kind: 'function' });
      }
      const structMatch = line.match(/^(?:pub\s+)?(?:struct|enum)\s+([A-Za-z0-9_]+)/);
      if (structMatch) {
        const name = structMatch[1];
        const isExported = line.startsWith('pub ');
        symbols.push({ name, kind: 'type', line: lineNum, exported: isExported });
        if (isExported) exports.push({ name, kind: 'type' });
      }
    }

    // Java: public class Name or public void name(...)
    if (language === 'java') {
      const classMatch = line.match(/^public\s+class\s+([A-Za-z0-9_]+)/);
      if (classMatch) {
        const name = classMatch[1];
        symbols.push({ name, kind: 'class', line: lineNum, exported: true });
        exports.push({ name, kind: 'class' });
      }
    }
  }

  const parts: string[] = [];
  if (exports.length > 0) parts.push(`Exports: ${exports.slice(0, 5).map((e) => e.name).join(', ')}`);
  else if (symbols.length > 0) parts.push(`Symbols: ${symbols.slice(0, 5).map((s) => s.name).join(', ')}`);
  const summary = parts.length > 0 ? parts.join(' | ') : `${language} file ${fileName}`;

  return {
    metadata: { symbols, imports: [], exports },
    summary,
  };
}

