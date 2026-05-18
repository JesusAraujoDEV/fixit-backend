/**
 * Technician Service API client functions.
 *
 * Provides typed functions for technician-specific endpoints
 * including availability toggle with request/response validation.
 *
 * @module api/services/technician
 */

import { createHttpClient, type HttpClient } from "../client/http-client";
import { TECHNICIAN_ENDPOINTS } from "../client/config";
import { availabilityRequestSchema, availabilityResponseSchema } from "../schemas/technician.schema";
import type { AvailabilityRequest, AvailabilityResponse } from "../types/technician";
import { ApiError } from "../client/errors";

// ---------------------------------------------------------------------------
// Service Factory
// ---------------------------------------------------------------------------

export interface TechnicianServiceConfig {
  /** HTTP client instance (uses default if not provided). */
  httpClient?: HttpClient;
}

/**
 * Creates a technician service instance with the given configuration.
 *
 * @example
 * ```ts
 * const techService = createTechnicianService({
 *   httpClient: createHttpClient({ tokenProvider: () => getToken() }),
 * });
 *
 * const result = await techService.updateAvailability({
 *   online: true,
 *   lat: 19.4326,
 *   lng: -99.1332,
 * });
 * ```
 */
export function createTechnicianService(config: TechnicianServiceConfig = {}) {
  const client = config.httpClient ?? createHttpClient();

  /**
   * Toggle technician online/offline availability.
   *
   * Sends PATCH /api/technician/availability with the technician's
   * current status and location. Validates the request body before
   * sending and validates the response against the expected schema.
   *
   * @param body - Availability update payload (online status + coordinates).
   * @returns The updated availability status with timestamp.
   * @throws {ApiError} If request body validation fails (code: "invalid_request_body").
   * @throws {AuthenticationError} If the user is not authenticated (401).
   * @throws {AuthorizationError} If the user lacks the technician role (403).
   */
  async function updateAvailability(body: AvailabilityRequest): Promise<AvailabilityResponse> {
    // Validate request body against schema before sending
    const parseResult = availabilityRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ApiError(
        400,
        "invalid_request_body",
        `Request validation failed: ${parseResult.error.message}`
      );
    }

    // Send PATCH request with validated body and validate response
    const response = await client.patch<AvailabilityResponse>(
      TECHNICIAN_ENDPOINTS.AVAILABILITY,
      parseResult.data,
      { schema: availabilityResponseSchema }
    );

    return response;
  }

  return { updateAvailability };
}

/** Type of the technician service instance. */
export type TechnicianService = ReturnType<typeof createTechnicianService>;
