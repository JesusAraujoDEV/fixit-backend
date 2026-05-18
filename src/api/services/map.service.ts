/**
 * Map Service API client functions.
 *
 * Provides typed functions for fetching map data:
 * - Request markers within a geographic radius
 * - Technician markers within a geographic radius
 * - Heatmap demand zones within a geographic radius
 *
 * All functions validate query parameters before sending and validate
 * responses against Zod schemas.
 *
 * @module api/services/map
 */

import { z } from "zod";
import { createHttpClient, type HttpClient } from "../client/http-client";
import { MAP_ENDPOINTS } from "../client/config";
import { ApiError } from "../client/errors";
import {
  mapQueryParamsSchema,
  requestMarkerSchema,
  technicianMarkerSchema,
  heatmapZoneSchema,
} from "../schemas/map.schema";
import type {
  MapQueryParams,
  RequestMarker,
  TechnicianMarker,
  HeatmapZone,
} from "../types/map";

// ---------------------------------------------------------------------------
// Response array schemas
// ---------------------------------------------------------------------------

const requestMarkersResponseSchema = z.array(requestMarkerSchema);
const technicianMarkersResponseSchema = z.array(technicianMarkerSchema);
const heatmapZonesResponseSchema = z.array(heatmapZoneSchema);

// ---------------------------------------------------------------------------
// Parameter Validation
// ---------------------------------------------------------------------------

/**
 * Validates map query parameters against the mapQueryParamsSchema.
 * Throws ApiError(400, "invalid_params") if validation fails.
 */
function validateMapQueryParams(params: MapQueryParams): void {
  const result = mapQueryParamsSchema.safeParse(params);
  if (!result.success) {
    throw new ApiError(
      400,
      "invalid_params",
      `Invalid map query parameters: ${result.error.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates map service API functions bound to the given HTTP client.
 *
 * @param client - An authenticated HTTP client instance.
 * @returns Object with map data fetching functions.
 *
 * @example
 * ```ts
 * const client = createHttpClient({ tokenProvider: () => token });
 * const mapService = createMapService(client);
 *
 * const markers = await mapService.getRequestMarkers({
 *   lat: 19.4326,
 *   lng: -99.1332,
 *   radius_km: 5,
 * });
 * ```
 */
export function createMapService(client: HttpClient) {
  /**
   * Fetches service request markers within the specified geographic radius.
   *
   * @param params - Query parameters with lat, lng, and radius_km.
   * @returns Array of request markers within the radius.
   * @throws {ApiError} 400 if query parameters are invalid.
   */
  async function getRequestMarkers(
    params: MapQueryParams
  ): Promise<RequestMarker[]> {
    validateMapQueryParams(params);

    return client.get<RequestMarker[]>(MAP_ENDPOINTS.REQUESTS, {
      params: {
        lat: params.lat,
        lng: params.lng,
        radius_km: params.radius_km,
        ...(params.all !== undefined && { all: params.all }),
      },
      schema: requestMarkersResponseSchema,
    });
  }

  /**
   * Fetches technician markers within the specified geographic radius.
   *
   * @param params - Query parameters with lat, lng, radius_km, and optional `all` flag.
   * @returns Array of technician markers within the radius.
   * @throws {ApiError} 400 if query parameters are invalid.
   */
  async function getTechnicianMarkers(
    params: MapQueryParams
  ): Promise<TechnicianMarker[]> {
    validateMapQueryParams(params);

    return client.get<TechnicianMarker[]>(MAP_ENDPOINTS.TECHNICIANS, {
      params: {
        lat: params.lat,
        lng: params.lng,
        radius_km: params.radius_km,
        ...(params.all !== undefined && { all: params.all }),
      },
      schema: technicianMarkersResponseSchema,
    });
  }

  /**
   * Fetches demand heatmap zones within the specified geographic radius.
   *
   * @param params - Query parameters with lat, lng, and radius_km.
   * @returns Array of heatmap zones within the radius.
   * @throws {ApiError} 400 if query parameters are invalid.
   */
  async function getHeatmapZones(
    params: MapQueryParams
  ): Promise<HeatmapZone[]> {
    validateMapQueryParams(params);

    return client.get<HeatmapZone[]>(MAP_ENDPOINTS.HEATMAP, {
      params: {
        lat: params.lat,
        lng: params.lng,
        radius_km: params.radius_km,
        ...(params.all !== undefined && { all: params.all }),
      },
      schema: heatmapZonesResponseSchema,
    });
  }

  return {
    getRequestMarkers,
    getTechnicianMarkers,
    getHeatmapZones,
  };
}
