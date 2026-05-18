/**
 * AI Diagnosis Service API Zod validation schemas
 * @module api/schemas/ai
 */

import { z } from "zod";
import type { DiagnosisResponse } from "../types/ai";

/** Service category enum for AI diagnosis */
const serviceCategoryEnum = z.enum([
  "electrical",
  "plumbing",
  "hvac",
  "general",
  "locksmith",
  "cleaning",
]);

/** Schema for POST /api/ai/diagnose response (200) */
export const diagnosisResponseSchema = z.object({
  diagnosis: z.string().min(1),
  confidence: z.number().min(0).max(1),
  suggested_category: serviceCategoryEnum,
  tags: z.array(z.string()),
}) satisfies z.ZodType<DiagnosisResponse>;
