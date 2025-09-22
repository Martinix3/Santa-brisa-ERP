// src/ai/zod-compat.ts
import type { z } from 'zod';

/**
 * A compatibility type for Zod schemas passed to Genkit.
 * Genkit's internal Zod instance may have different "branding" properties
 * than the one used in the application. This type helps bridge the gap
 * and satisfy TypeScript's structural checks.
 */
export type GenkitZodCompat = z.ZodTypeAny & { ['~standard']?: unknown; ['~validate']?: unknown };
