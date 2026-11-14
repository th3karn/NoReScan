import { describe, it, expect } from 'vitest';
import { hashBuffer, hashString, detectLanguage } from '../src/index.js';

describe('hasher & fingerprinting', () => {
  it('generates consistent SHA-256 hashes for strings', () => {
    const hash1 = hashString('const x = 1;');
    const hash2 = hashString('const x = 1;');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('normalizes CRLF to LF by default', () => {
    const unixHash = hashString('line 1\nline 2', true);
    const winHash = hashString('line 1\r\nline 2', true);
    expect(unixHash).toBe(winHash);
  });

  it('detects programming languages accurately', () => {
    expect(detectLanguage('index.ts')).toBe('typescript');
    expect(detectLanguage('app.py')).toBe('python');
    expect(detectLanguage('main.go')).toBe('go');
    expect(detectLanguage('schema.sql')).toBe('sql');
    expect(detectLanguage('unknown.xyz')).toBe('unknown');
  });
});

