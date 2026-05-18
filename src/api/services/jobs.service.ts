/**
 * Jobs API functions for the FixIt platform (Technician).
 *
 * Provides typed functions for retrieving available jobs near a technician
 * and fetching completed job history. All responses are validated
 * against Zod schemas before returning.
 *
 * @module api/services/jobs
 */

import { z } from "zod";
import type { HttpClient } from "../client/http-client";
import { JOB_ENDPOINTS } from "../client/config";
import { availableJobSchema, completedJobSchema } from "../schemas/jobs.schema";
import type { AvailableJob, CompletedJob } from "../types/jobs";

// ---------------------------------------------------------------------------
// Service Factory
// ---------------------------------------------------------------------------

/**
 * Creates a jobs service instance bound to the given HTTP client.
 *
 * @param client - An HTTP client instance created via `createHttpClient`.
 * @returns Object with job-related API functions.
 *
 * @example
 * ```ts
 * const client = createHttpClient({ tokenProvider: () => token });
 * const jobsService = createJobsService(client);
 * const jobs = await jobsService.getAvailableJobs({ lat: 19.4, lng: -99.1 });
 * ```
 */
export function createJobsService(client: HttpClient) {
  /**
   * Get available jobs near the technician's location.
   *
   * Requires lat and lng coordinates. Optionally filters by category.
   * Validates the response array element-by-element against `availableJobSchema`.
   *
   * @param params - Object with lat, lng (required) and optional category filter.
   * @returns Array of available job objects sorted by urgency then distance.
   *
   * Validates: Requirements 7.1, 7.2, 7.3
   */
  async function getAvailableJobs(params: {
    lat: number;
    lng: number;
    category?: string;
  }): Promise<AvailableJob[]> {
    return client.get<AvailableJob[]>(JOB_ENDPOINTS.AVAILABLE, {
      params: {
        lat: params.lat,
        lng: params.lng,
        category: params.category,
      },
      schema: z.array(availableJobSchema),
    });
  }

  /**
   * Get the technician's completed job history.
   *
   * Optionally filters by date range using ISO-8601 date strings.
   * Validates the response array element-by-element against `completedJobSchema`.
   *
   * @param params - Optional object with date_from and date_to filters.
   * @returns Array of completed job objects.
   *
   * Validates: Requirements 7.4
   */
  async function getCompletedJobs(params?: {
    date_from?: string;
    date_to?: string;
  }): Promise<CompletedJob[]> {
    return client.get<CompletedJob[]>(JOB_ENDPOINTS.COMPLETED, {
      params: {
        date_from: params?.date_from,
        date_to: params?.date_to,
      },
      schema: z.array(completedJobSchema),
    });
  }

  return {
    getAvailableJobs,
    getCompletedJobs,
  };
}
