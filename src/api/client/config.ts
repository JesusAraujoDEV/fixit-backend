/**
 * API base configuration and endpoint constants for the FixIt platform.
 *
 * This module defines the base URL, default headers, timeout settings,
 * and all REST/WebSocket endpoint path constants used by the API client layer.
 */

// ---------------------------------------------------------------------------
// Base Configuration
// ---------------------------------------------------------------------------

/**
 * Base URL for the REST API.
 * Reads from the VITE_API_BASE_URL environment variable at build time,
 * falling back to a local development default.
 */
export const API_BASE_URL: string =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_API_BASE_URL) ||
  "http://localhost:3000";

/**
 * Base URL for WebSocket connections.
 * Derives the WS protocol from the REST base URL (http → ws, https → wss).
 */
export const WS_BASE_URL: string =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_WS_BASE_URL) ||
  API_BASE_URL.replace(/^http/, "ws");

// ---------------------------------------------------------------------------
// Default Headers
// ---------------------------------------------------------------------------

/**
 * Default headers sent with every REST request.
 * The Authorization header is injected dynamically by the HTTP client wrapper.
 */
export const DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

// ---------------------------------------------------------------------------
// Timeout Settings
// ---------------------------------------------------------------------------

/** Default request timeout in milliseconds (30 seconds). */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Timeout for AI diagnosis uploads (longer due to processing — 60 seconds). */
export const AI_UPLOAD_TIMEOUT_MS = 60_000;

/** WebSocket heartbeat interval in milliseconds (30 seconds). */
export const WS_HEARTBEAT_INTERVAL_MS = 30_000;

/** WebSocket pong response timeout in milliseconds (10 seconds). */
export const WS_PONG_TIMEOUT_MS = 10_000;

/** WebSocket reconnection base delay in milliseconds (1 second). */
export const WS_RECONNECT_BASE_DELAY_MS = 1_000;

/** WebSocket maximum reconnection delay in milliseconds (30 seconds). */
export const WS_RECONNECT_MAX_DELAY_MS = 30_000;

// ---------------------------------------------------------------------------
// REST Endpoint Paths
// ---------------------------------------------------------------------------

/** Authentication endpoints. */
export const AUTH_ENDPOINTS = {
  /** POST — Authenticate user, return JWT + user object. */
  LOGIN: "/api/auth/login",
  /** GET — Return current user session data. */
  ME: "/api/auth/me",
} as const;

/** Map data endpoints. */
export const MAP_ENDPOINTS = {
  /** GET — Service request markers within radius. */
  REQUESTS: "/api/map/requests",
  /** GET — Technician markers within radius. */
  TECHNICIANS: "/api/map/technicians",
  /** GET — Demand heatmap zones. */
  HEATMAP: "/api/map/heatmap",
} as const;

/** Service request endpoints. */
export const REQUEST_ENDPOINTS = {
  /** POST — Create a new service request. */
  CREATE: "/api/requests",
  /** GET — Client's request history. */
  MINE: "/api/requests/mine",
} as const;

/** Job endpoints (Technician). */
export const JOB_ENDPOINTS = {
  /** GET — Available jobs near technician. */
  AVAILABLE: "/api/jobs/available",
  /** GET — Technician's completed jobs. */
  COMPLETED: "/api/jobs/completed",
} as const;

/** Technician service endpoints. */
export const TECHNICIAN_ENDPOINTS = {
  /** PATCH — Toggle online/offline availability. */
  AVAILABILITY: "/api/technician/availability",
} as const;

/** Admin endpoints. */
export const ADMIN_ENDPOINTS = {
  /** GET — List transactions with pagination. */
  TRANSACTIONS: "/api/admin/transactions",
  /** GET — Today's transaction summary. */
  TRANSACTIONS_SUMMARY: "/api/admin/transactions/summary",
  /** GET — List technician verifications. */
  VERIFICATIONS: "/api/admin/verifications",
  /**
   * PATCH — Approve/reject a verification.
   * Use `VERIFICATION_BY_ID(id)` helper for the full path.
   */
  VERIFICATIONS_BASE: "/api/admin/verifications",
  /** GET — Recent platform events. */
  EVENTS: "/api/admin/events",
  /** GET — KPI dashboard metrics. */
  KPIS: "/api/admin/kpis",
  /** GET — Weekly performance data. */
  PERFORMANCE_WEEKLY: "/api/admin/performance/weekly",
} as const;

/**
 * Returns the endpoint path for a specific verification by ID.
 * @example VERIFICATION_BY_ID("abc-123") → "/api/admin/verifications/abc-123"
 */
export function VERIFICATION_BY_ID(id: string): string {
  return `${ADMIN_ENDPOINTS.VERIFICATIONS_BASE}/${id}`;
}

/** AI service endpoints. */
export const AI_ENDPOINTS = {
  /** POST — Upload photo for AI diagnosis (multipart/form-data). */
  DIAGNOSE: "/api/ai/diagnose",
} as const;

// ---------------------------------------------------------------------------
// WebSocket Paths
// ---------------------------------------------------------------------------

/** Role-scoped WebSocket connection paths. */
export const WS_PATHS = {
  /** Client real-time channel (radar search, tracking). */
  CLIENT: "/ws/client",
  /** Technician real-time channel (mission alerts). */
  TECHNICIAN: "/ws/technician",
  /** Admin real-time channel (event stream). */
  ADMIN: "/ws/admin",
} as const;
