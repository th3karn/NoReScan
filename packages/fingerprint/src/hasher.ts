import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';

/**
 * Calculates deterministic SHA-256 hex hash of a Buffer.
 */
export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculates SHA-256 hash of a string, optionally normalizing CRLF to LF.
 */
export function hashString(content: string, normalizeLineEndings = true): string {
  const normalized = normalizeLineEndings ? content.replace(/\r\n/g, '\n') : content;
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Reads a physical file and calculates its SHA-256 hash.
 */
export async function hashFile(filePath: string, normalizeLineEndings = true): Promise<string> {
  const buffer = await fs.readFile(filePath);
  if (normalizeLineEndings) {
    // Check if file is likely binary (contains null bytes)
    if (buffer.includes(0)) {
      return hashBuffer(buffer);
    }
    const text = buffer.toString('utf8');
    return hashString(text, true);
  }
  return hashBuffer(buffer);
}
