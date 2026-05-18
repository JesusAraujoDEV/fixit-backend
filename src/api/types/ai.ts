/**
 * AI Diagnosis Service API contract types
 * @module api/types/ai
 */

import type { ServiceCategory } from "./requests";

/** POST /api/ai/diagnose - Response (200) */
export interface DiagnosisResponse {
  diagnosis: string;
  confidence: number; // 0.0 - 1.0
  suggested_category: ServiceCategory;
  tags: string[];
}
