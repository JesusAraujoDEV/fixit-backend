/**
 * Service Request API Zod validation schemas
 * @module api/schemas/requests
 */

import { z } from "zod";
import type { CreateRequestBody, CreateRequestResponse, ClientRequest } from "../types/requests";

/** Service category enum */
const serviceCategoryEnum = z.enum([
  "electrical",
  "plumbing",
  "hvac",
  "general",
  "locksmith",
  "cleaning",
]);

/** Location schema for service requests */
const requestLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().min(1),
});

/** Schema for POST /api/requests request body */
export const createRequestBodySchema = z.object({
  title: z.string().min(5).max(200),
  category: serviceCategoryEnum,
  description: z.string().min(0).max(2000),
  location: requestLocationSchema,
  images: z.array(z.string().url()).max(4),
}) satisfies z.ZodType<CreateRequestBody>;

/** Schema for POST /api/requests response (201) */
export const createRequestResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string(),
  location: requestLocationSchema,
  images: z.array(z.string()),
  status: z.literal("pending"),
  created_at: z.string().datetime(),
  nearby_technicians_count: z.number().int().min(0),
  estimated_response_min: z.number().int().min(0),
}) satisfies z.ZodType<CreateRequestResponse>;

/** Client request status enum */
const clientRequestStatusEnum = z.enum(["active", "completed", "cancelled"]);

/** Schema for GET /api/requests/mine response item */
export const clientRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  status: clientRequestStatusEnum,
  technician: z.object({ name: z.string() }).nullable(),
  created_at: z.string().datetime(),
  price: z.string().nullable(),
  eta_minutes: z.number().int().nullable().optional(),
}) satisfies z.ZodType<ClientRequest>;
