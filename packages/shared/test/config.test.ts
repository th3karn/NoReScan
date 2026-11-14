import { describe, it, expect } from 'vitest';
import { parseConfig, CodeCacheConfigSchema } from '../src/config.js';
import { ZodError } from 'zod';

describe('config schema', () => {
  it('parses valid configuration with defaults', () => {
    const raw = {
      projectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      projectName: 'test-project',
    };
    const parsed = parseConfig(raw);
    expect(parsed.projectId).toBe(raw.projectId);
    expect(parsed.projectName).toBe('test-project');
    expect(parsed.version).toBe(1);
    expect(parsed.maxFileSizeKb).toBe(2048);
    expect(parsed.contextBudgetTokens).toBe(8000);
    expect(parsed.conservativeInvalidation).toBe(true);
    expect(parsed.sync.enabled).toBe(false);
  });

  it('rejects invalid UUID for projectId', () => {
    const invalid = {
      projectId: 'not-a-uuid',
      projectName: 'test-project',
    };
    expect(() => parseConfig(invalid)).toThrow(ZodError);
  });
});

