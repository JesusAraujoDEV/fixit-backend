/**
 * Error response API Zod validation schemas
 * @module api/schemas/errors
 */

import { z } from "zod";
import type { ErrorResponse, ValidationErrorResponse } from "../types/errors";

/** Schema for standard error response */
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
}) satisfies z.ZodType<ErrorResponse>;

/** Schema for individual validation error entry */
const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

/** Schema for validation error response (HTTP 422) */
export const validationErrorResponseSchema = z.object({
  errors: z.array(validationErrorSchema).min(1),
}) satisfies z.ZodType<ValidationErrorResponse>;
