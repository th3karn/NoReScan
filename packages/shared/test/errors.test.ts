import { describe, it, expect } from 'vitest';
import { NoReScanError, SecurityViolationError, DatabaseError } from '../src/errors.js';

describe('error classes', () => {
  it('serializes NoReScanError to JSON properly', () => {
    const err = new SecurityViolationError('Unauthorized traversal', { target: '../secret' });
    expect(err.code).toBe('SECURITY_VIOLATION');
    expect(err.recoverable).toBe(false);
    expect(err.message).toBe('Unauthorized traversal');
    const json = err.toJSON();
    expect(json.name).toBe('SecurityViolationError');
    expect(json.code).toBe('SECURITY_VIOLATION');
    expect(json.details).toEqual({ target: '../secret' });
  });

  it('preserves error inheritance hierarchy', () => {
    const dbErr = new DatabaseError('Disk full');
    expect(dbErr instanceof NoReScanError).toBe(true);
    expect(dbErr instanceof Error).toBe(true);
  });
});

