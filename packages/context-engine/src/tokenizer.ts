const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'at', 'from',
  'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'to', 'of', 'up', 'down', 'in', 'out', 'on',
  'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's',
  't', 'can', 'will', 'just', 'don', 'should', 'now', 'update', 'fix', 'add',
  'refactor', 'implement', 'modify', 'change', 'make', 'create', 'please', 'help'
]);

/**
 * Tokenizes a query into normalized lowercase terms, expanding camelCase and kebab-case.
 */
export function extractQueryTokens(query: string): string[] {
  if (!query) return [];

  // Split on punctuation, whitespace, slashes
  const rawWords = query
    .replace(/[/\\._-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const tokens = new Set<string>();

  for (const word of rawWords) {
    // Split camelCase e.g. authService -> auth, Service
    const splitCamel = word.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/);
    for (const sub of splitCamel) {
      const lower = sub.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.length > 1 && !STOP_WORDS.has(lower)) {
        tokens.add(lower);
      }
    }
  }

  return Array.from(tokens);
}
