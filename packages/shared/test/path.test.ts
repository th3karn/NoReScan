import { describe, it, expect } from 'vitest';
import { normalizePath, assertPathContained, getRelativePath, isSensitivePath } from '../src/path.js';
import { SecurityViolationError } from '../src/errors.js';
import path from 'node:path';

describe('path utilities', () => {
  it('normalizes backslashes to forward slashes', () => {
    expect(normalizePath('src\\auth\\service.ts')).toBe('src/auth/service.ts');
    expect(normalizePath('C:\\projects\\code-cache\\src')).toBe('C:/projects/code-cache/src');
  });

  it('collapses consecutive slashes and strips trailing slashes', () => {
    expect(normalizePath('src///utils//')).toBe('src/utils');
  });

  it('asserts path containment correctly', () => {
    const root = 'C:/projects/my-repo';
    const safeTarget = 'src/index.ts';
    const result = assertPathContained(safeTarget, root);
    expect(result).toBe('C:/projects/my-repo/src/index.ts');
  });

  it('throws SecurityViolationError when path escapes root', () => {
    const root = 'C:/projects/my-repo';
    const escapeTarget = '../../Windows/System32/cmd.exe';
    expect(() => assertPathContained(escapeTarget, root)).toThrow(SecurityViolationError);
  });

  it('detects sensitive secret file paths', () => {
    expect(isSensitivePath('.env')).toBe(true);
    expect(isSensitivePath('.env.production')).toBe(true);
    expect(isSensitivePath('certs/server.key')).toBe(true);
    expect(isSensitivePath('keys/cert.pem')).toBe(true);
    expect(isSensitivePath('src/auth/service.ts')).toBe(false);
    expect(isSensitivePath('package.json')).toBe(false);
  });
});

