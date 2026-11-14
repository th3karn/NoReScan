import { z } from 'zod';

export const BugBrainConfigSchema = z.object({
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

export type BugBrainConfig = z.infer<typeof BugBrainConfigSchema>;

export const DEFAULT_CONFIG: Omit<BugBrainConfig, 'projectId' | 'projectName'> = {
  version: 1,
  maxFileSizeKb: 2048,
  ignorePatterns: [],
  contextBudgetTokens: 8000,
  conservativeInvalidation: true,
  sync: {
    enabled: false,
  },
};

export function parseConfig(raw: unknown): BugBrainConfig {
  return BugBrainConfigSchema.parse(raw);
}

