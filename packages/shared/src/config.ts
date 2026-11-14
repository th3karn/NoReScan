import { z } from 'zod';

export const NoReScanConfigSchema = z.object({
  version: z.number().int().default(1),
  projectId: z.string().uuid(),
  projectName: z.string().min(1),
  maxFileSizeKb: z.number().int().positive().default(2048), // 2MB default
  ignorePatterns: z.array(z.string()).default([]),
  contextBudgetTokens: z.number().int().positive().default(8000),
  conservativeInvalidation: z.boolean().default(true),
  sync: z.object({
    enabled: z.boolean().default(false),
    endpoint: z.string().url().optional(),
  }).default({ enabled: false }),
});

export type NoReScanConfig = z.infer < typeof NoReScanConfigSchema >;

export const DEFAULT_CONFIG: Omit<NoReScanConfig, 'projectId' | 'projectName' > = {
  version: 1,
    maxFileSizeKb: 2048,
      ignorePatterns: [],
        contextBudgetTokens: 8000,
          conservativeInvalidation: true,
            sync: {
    enabled: false,
  },
};

export function parseConfig(raw: unknown): NoReScanConfig {
  return NoReScanConfigSchema.parse(raw);
}

