import { AstMetadata, ModelDefinition, SymbolDefinition } from '@bugbrain/shared';

export function parseSql(sourceText: string, fileName: string): { metadata: AstMetadata; summary: string } {
  const models: ModelDefinition[] = [];
  const symbols: SymbolDefinition[] = [];

  // Match CREATE TABLE [IF NOT EXISTS] tableName (...)
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_"]+)\s*\(([\s\S]*?)\);/gi;
  let match;

  while ((match = tableRegex.exec(sourceText)) !== null) {
    const rawTableName = match[1].replace(/["`]/g, '');
    const body = match[2];

    const fields: Array<{ name: string; type: string; isOptional?: boolean }> = [];
    const lines = body.split(',').map((l) => l.trim()).filter((l) => l.length > 0);

    for (const l of lines) {
      if (l.startsWith('PRIMARY KEY') || l.startsWith('FOREIGN KEY') || l.startsWith('CONSTRAINT') || l.startsWith('UNIQUE')) {
        continue;
      }
      const parts = l.split(/\s+/);
      if (parts.length >= 2) {
        fields.push({
          name: parts[0].replace(/["`]/g, ''),
          type: parts[1],
          isOptional: !l.toUpperCase().includes('NOT NULL'),
        });
      }
    }

    models.push({ name: rawTableName, fields });
    symbols.push({ name: rawTableName, kind: 'table', line: 1, exported: true });
  }

  const summary = models.length > 0
    ? `Database tables: ${models.map((m) => m.name).join(', ')}`
    : `SQL schema file ${fileName}`;

  return {
    metadata: {
      symbols,
      imports: [],
      exports: models.map((m) => ({ name: m.name, kind: 'class' })),
      models,
    },
    summary,
  };
}

