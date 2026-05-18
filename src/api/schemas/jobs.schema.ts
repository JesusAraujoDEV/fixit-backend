/**
 * Jobs API Zod validation schemas (Technician)
 * @module api/schemas/jobs
 */

import { z } from "zod";
import type { AvailableJob, CompletedJob } from "../types/jobs";

/** Schema for GET /api/jobs/available response item */
export const availableJobSchema = z.object({
  id: z.string(),
  category: z.string(),
  title: z.string(),
  distance_km: z.number().min(0),
  expires_in_min: z.number().int().min(0),
  payout: z.string(),
  urgent: z.boolean(),
}) satisfies z.ZodType<AvailableJob>;

/** Schema for GET /api/jobs/completed response item */
export const completedJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  earnings: z.string(),
  rating: z.number().int().min(1).max(5),
  completed_at: z.string().datetime(),
}) satisfies z.ZodType<CompletedJob>;
