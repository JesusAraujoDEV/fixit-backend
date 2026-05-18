/**
 * Service Request API functions for the FixIt platform.
 *
 * Provides typed functions for creating service requests and
 * retrieving client request history. All request bodies are validated
 * against Zod schemas before sending, and responses are validated
 * against Zod schemas before returning.
 *
 * @module api/services/requests
 */

import { z } from "zod";
import { createHttpClient, type HttpClient } from "../client/http-client";
import { REQUEST_ENDPOINTS } from "../client/config";
import { ValidationError } from "../client/errors";
import {
  createRequestBodySchema,
  createRequestResponseSchema,
  clientRequestSchema,
} from "../schemas/requests.schema";
import type {
  CreateRequestBody,
  CreateRequestResponse,
  ClientRequest,
  ClientRequestStatus,
} from "../types/requests";

// ---------------------------------------------------------------------------
// Service Factory
// ---------------------------------------------------------------------------

/**
 * Creates a requests service instance bound to the given HTTP client.
 *
 * @param client - An HTTP client instance created via `createHttpClient`.
 * @returns Object with service request API functions.
 *
 * @example
 * ```ts
 * const client = createHttpClient({ tokenProvider: () => token });
 * const requestsService = createRequestsService(client);
 * const response = await requestsService.createRequest({ ... });
 * ```
 */
export function createRequestsService(client: HttpClient) {
  /**
   * Create a new service request.
   *
   * Validates the request body against `createRequestBodySchema` before sending.
   * Throws `ValidationError` if the body is invalid.
   * Validates the response against `createRequestResponseSchema`.
   *
   * @param body - The service request creation payload.
   * @returns The created request with generated id, status, and metadata.
   * @throws {ValidationError} If the request body fails schema validation.
   *
   * Validates: Requirements 6.1, 6.2, 6.3
   */
  async function createRequest(body: CreateRequestBody): Promise<CreateRequestResponse> {
    // Validate request body before sending
    const bodyResult = createRequestBodySchema.safeParse(body);
    if (!bodyResult.success) {
      const fieldErrors = bodyResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      throw new ValidationError(fieldErrors, "Request body validation failed");
    }

    return client.post<CreateRequestResponse>(REQUEST_ENDPOINTS.CREATE, bodyResult.data, {
      schema: createRequestResponseSchema,
    });
  }

  /**
   * Get the authenticated client's service request history.
   *
   * Optionally filters by status. Validates the response array
   * element-by-element against `clientRequestSchema`.
   *
   * @param status - Optional filter: "active", "completed", or "cancelled".
   * @returns Array of client request objects sorted by created_at descending.
   *
   * Validates: Requirements 8.1, 8.2, 8.3
   */
  async function getMyRequests(status?: ClientRequestStatus): Promise<ClientRequest[]> {
    const params: Record<string, string | undefined> = {};
    if (status) {
      params.status = status;
    }

    return client.get<ClientRequest[]>(REQUEST_ENDPOINTS.MINE, {
      params,
      schema: z.array(clientRequestSchema),
    });
  }

  return {
    createRequest,
    getMyRequests,
  };
}
