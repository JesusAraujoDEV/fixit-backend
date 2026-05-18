/**
 * Technician Service API Zod validation schemas
 * @module api/schemas/technician
 */

import { z } from "zod";
import type { AvailabilityRequest, AvailabilityResponse } from "../types/technician";

/** Schema for PATCH /api/technician/availability request body */
export const availabilityRequestSchema = z.object({
  online: z.boolean(),
  lat: z.number(),
  lng: z.number(),
}) satisfies z.ZodType<AvailabilityRequest>;

/** Schema for PATCH /api/technician/availability response (200) */
export const availabilityResponseSchema = z.object({
  online: z.boolean(),
  updated_at: z.string().datetime(),
}) satisfies z.ZodType<AvailabilityResponse>;
