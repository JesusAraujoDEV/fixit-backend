/**
 * Admin Service API functions
 *
 * Provides typed functions for all admin-related API endpoints:
 * transactions, verifications, events, KPIs, and weekly performance.
 * All endpoints require admin role authentication.
 *
 * @module api/services/admin
 */

import type { HttpClient } from "../client/http-client";
import { createHttpClient } from "../client/http-client";
import { ADMIN_ENDPOINTS, VERIFICATION_BY_ID } from "../client/config";
import {
  transactionsResponseSchema,
  transactionSummarySchema,
  verificationSchema,
  platformEventSchema,
  kpiResponseSchema,
  weeklyPerformanceSchema,
} from "../schemas/admin.schema";
import type {
  TransactionsResponse,
  TransactionSummary,
  Verification,
  VerificationAction,
  PlatformEvent,
  KPIResponse,
  WeeklyPerformance,
} from "../types/admin";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Query parameters for GET /api/admin/transactions */
export interface TransactionsParams {
  page?: number;
  per_page?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
}

/** Query parameters for GET /api/admin/events */
export interface EventsParams {
  limit?: number;
  type?: string;
}

// ---------------------------------------------------------------------------
// Admin Service Factory
// ---------------------------------------------------------------------------

/**
 * Creates an admin service instance bound to the given HTTP client.
 *
 * @param client - An HttpClient instance (created via createHttpClient)
 * @returns Object with all admin API functions
 *
 * @example
 * ```ts
 * const client = createHttpClient({ tokenProvider: () => adminToken });
 * const adminService = createAdminService(client);
 * const txns = await adminService.getTransactions({ page: 1, per_page: 20 });
 * ```
 */
export function createAdminService(client: HttpClient) {
  /**
   * Fetch paginated transactions with optional filters.
   *
   * GET /api/admin/transactions
   * @param params - Optional pagination and filter parameters
   * @returns Paginated transactions response validated against schema
   */
  async function getTransactions(
    params?: TransactionsParams
  ): Promise<TransactionsResponse> {
    const queryParams: Record<string, string | number | boolean | undefined> =
      {};

    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.per_page !== undefined) queryParams.per_page = params.per_page;
    if (params?.status !== undefined) queryParams.status = params.status;
    if (params?.date_from !== undefined)
      queryParams.date_from = params.date_from;
    if (params?.date_to !== undefined) queryParams.date_to = params.date_to;

    return client.get<TransactionsResponse>(ADMIN_ENDPOINTS.TRANSACTIONS, {
      params: queryParams,
      schema: transactionsResponseSchema,
    });
  }

  /**
   * Fetch today's transaction summary.
   *
   * GET /api/admin/transactions/summary
   * @returns Transaction summary validated against schema
   */
  async function getTransactionSummary(): Promise<TransactionSummary> {
    return client.get<TransactionSummary>(
      ADMIN_ENDPOINTS.TRANSACTIONS_SUMMARY,
      {
        schema: transactionSummarySchema,
      }
    );
  }

  /**
   * Fetch technician verifications with optional status filter.
   *
   * GET /api/admin/verifications
   * @param status - Optional filter: "pending", "approved", or "rejected"
   * @returns Array of verification objects validated against schema
   */
  async function getVerifications(
    status?: "pending" | "approved" | "rejected"
  ): Promise<Verification[]> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (status !== undefined) params.status = status;

    return client.get<Verification[]>(ADMIN_ENDPOINTS.VERIFICATIONS, {
      params,
      schema: z.array(verificationSchema),
    });
  }

  /**
   * Approve or reject a technician verification.
   *
   * PATCH /api/admin/verifications/:id
   * @param id - Verification ID
   * @param action - Action object with "approve" or "reject" and optional reason
   * @returns Updated verification object validated against schema
   */
  async function updateVerification(
    id: string,
    action: VerificationAction
  ): Promise<Verification> {
    return client.patch<Verification>(VERIFICATION_BY_ID(id), action, {
      schema: verificationSchema,
    });
  }

  /**
   * Fetch recent platform events with optional filters.
   *
   * GET /api/admin/events
   * @param params - Optional limit and type filter
   * @returns Array of platform events validated against schema
   */
  async function getEvents(params?: EventsParams): Promise<PlatformEvent[]> {
    const queryParams: Record<string, string | number | boolean | undefined> =
      {};

    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.type !== undefined) queryParams.type = params.type;

    return client.get<PlatformEvent[]>(ADMIN_ENDPOINTS.EVENTS, {
      params: queryParams,
      schema: z.array(platformEventSchema),
    });
  }

  /**
   * Fetch KPI dashboard metrics.
   *
   * GET /api/admin/kpis
   * @returns KPI response validated against schema
   */
  async function getKPIs(): Promise<KPIResponse> {
    return client.get<KPIResponse>(ADMIN_ENDPOINTS.KPIS, {
      schema: kpiResponseSchema,
    });
  }

  /**
   * Fetch weekly performance data.
   *
   * GET /api/admin/performance/weekly
   * @returns Weekly performance response validated against schema
   */
  async function getWeeklyPerformance(): Promise<WeeklyPerformance> {
    return client.get<WeeklyPerformance>(ADMIN_ENDPOINTS.PERFORMANCE_WEEKLY, {
      schema: weeklyPerformanceSchema,
    });
  }

  return {
    getTransactions,
    getTransactionSummary,
    getVerifications,
    updateVerification,
    getEvents,
    getKPIs,
    getWeeklyPerformance,
  };
}

/** Type of the admin service instance returned by createAdminService. */
export type AdminService = ReturnType<typeof createAdminService>;
