/**
 * Map Service API Zod validation schemas
 * @module api/schemas/map
 */

import { z } from "zod";
import type { MapQueryParams, RequestMarker, TechnicianMarker, HeatmapZone } from "../types/map";

/** Request category enum (Spanish labels) */
const requestCategoryEnum = z.enum([
  "Electricidad",
  "Plomería",
  "Climatización",
  "General",
  "Cerrajería",
]);

/** Technician status enum */
const technicianStatusEnum = z.enum(["available", "en_route", "busy"]);

/** Position tuple: [latitude, longitude] */
const positionSchema = z.tuple([z.number(), z.number()]);

/** Schema for map query parameters */
export const mapQueryParamsSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radius_km: z.number().positive(),
  all: z.literal("true").optional(),
}) satisfies z.ZodType<MapQueryParams>;

/** Schema for GET /api/map/requests response item */
export const requestMarkerSchema = z.object({
  id: z.string(),
  position: positionSchema,
  label: z.string(),
  type: z.literal("request"),
  category: requestCategoryEnum,
}) satisfies z.ZodType<RequestMarker>;

/** Schema for GET /api/map/technicians response item */
export const technicianMarkerSchema = z.object({
  id: z.string(),
  position: positionSchema,
  label: z.string(),
  type: z.literal("technician"),
  status: technicianStatusEnum,
}) satisfies z.ZodType<TechnicianMarker>;

/** Schema for GET /api/map/heatmap response item */
export const heatmapZoneSchema = z.object({
  id: z.string(),
  center: positionSchema,
  radius_m: z.number().positive(),
  intensity: z.number().min(0).max(1),
  label: z.string().min(1),
}) satisfies z.ZodType<HeatmapZone>;
