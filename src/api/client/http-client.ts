/**
 * Typed HTTP client wrapper for the FixIt API.
 *
 * Provides a fetch-based client that handles:
 * - JWT Bearer token injection via a configurable token provider
 * - Request timeout via AbortController
 * - Response parsing and Zod schema validation
 * - Error classification and mapping to custom error classes
 *
 * @module api/client/http-client
 */

import type { z } from "zod";
import { API_BASE_URL, DEFAULT_HEADERS, DEFAULT_TIMEOUT_MS } from "./config";
import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "./errors";
import type { ErrorCode } from "../types/errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Function that returns the current JWT token, or null if unauthenticated. */
export type TokenProvider = () => string | null | Promise<string | null>;

/** Supported HTTP methods. */
export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

/** Options for a single HTTP request. */
export interface RequestOptions<T = unknown> {
  /** HTTP method. */
  method: HttpMethod;
  /** Endpoint path (relative to API_BASE_URL, e.g. "/api/auth/login"). */
  path: string;
  /** Optional JSON body for POST/PATCH requests. */
  body?: unknown;
  /** Optional query parameters appended to the URL. */
  params?: Record<string, string | number | boolean | undefined>;
  /** Optional Zod schema to validate the response body. */
  schema?: z.ZodType<T>;
  /** Override the default timeout in milliseconds. */
  timeoutMs?: number;
  /** Additional headers to merge with defaults. */
  headers?: Record<string, string>;
}

/** Configuration for the HTTP client instance. */
export interface HttpClientConfig {
  /** Base URL for all requests. Defaults to API_BASE_URL from config. */
  baseUrl?: string;
  /** Token provider function for JWT injection. Pass null for unauthenticated clients. */
  tokenProvider?: TokenProvider | null;
  /** Default timeout in milliseconds. Defaults to DEFAULT_TIMEOUT_MS. */
  defaultTimeoutMs?: number;
  /** Default headers merged into every request. Defaults to DEFAULT_HEADERS. */
  defaultHeaders?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// HTTP Client
// ---------------------------------------------------------------------------

/**
 * Creates a configured HTTP client instance.
 *
 * @example
 * ```ts
 * const client = createHttpClient({
 *   tokenProvider: () => localStorage.getItem("token"),
 * });
 *
 * const session = await client.request({
 *   method: "GET",
 *   path: "/api/auth/me",
 *   schema: sessionResponseSchema,
 * });
 * ```
 */
export function createHttpClient(config: HttpClientConfig = {}) {
  const {
    baseUrl = API_BASE_URL,
    tokenProvider = null,
    defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
    defaultHeaders = DEFAULT_HEADERS,
  } = config;

  /**
   * Execute a typed HTTP request.
   *
   * @template T - The expected response type (inferred from schema if provided).
   * @param options - Request configuration.
   * @returns Parsed and optionally validated response body.
   * @throws {ApiError} For unclassified HTTP errors.
   * @throws {AuthenticationError} For 401 responses.
   * @throws {AuthorizationError} For 403 responses.
   * @throws {NotFoundError} For 404 responses.
   * @throws {ValidationError} For 422 responses with field errors.
   */
  async function request<T>(options: RequestOptions<T>): Promise<T> {
    const { method, path, body, params, schema, timeoutMs, headers } = options;

    // Build URL with query parameters
    const url = buildUrl(baseUrl, path, params);

    // Resolve authorization header
    const authHeaders: Record<string, string> = {};
    if (tokenProvider) {
      const token = await tokenProvider();
      if (token) {
        authHeaders["Authorization"] = `Bearer ${token}`;
      }
    }

    // Merge headers
    const mergedHeaders: Record<string, string> = {
      ...defaultHeaders,
      ...authHeaders,
      ...headers,
    };

    // Set up timeout via AbortController
    const controller = new AbortController();
    const timeout = timeoutMs ?? defaultTimeoutMs;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers: mergedHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError(0, "timeout", `Request timed out after ${timeout}ms`);
      }
      throw new ApiError(0, "network_error", getErrorMessage(error));
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle error responses
    if (!response.ok) {
      await handleErrorResponse(response);
    }

    // Parse successful response
    const data = await parseResponseBody(response);

    // Validate against Zod schema if provided
    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        throw new ApiError(
          response.status,
          "response_validation_error",
          `Response validation failed: ${result.error.message}`
        );
      }
      return result.data;
    }

    return data as T;
  }

  // Convenience methods
  async function get<T>(path: string, options?: Omit<RequestOptions<T>, "method" | "path">): Promise<T> {
    return request<T>({ method: "GET", path, ...options });
  }

  async function post<T>(path: string, body?: unknown, options?: Omit<RequestOptions<T>, "method" | "path" | "body">): Promise<T> {
    return request<T>({ method: "POST", path, body, ...options });
  }

  async function patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions<T>, "method" | "path" | "body">): Promise<T> {
    return request<T>({ method: "PATCH", path, body, ...options });
  }

  async function del<T>(path: string, options?: Omit<RequestOptions<T>, "method" | "path">): Promise<T> {
    return request<T>({ method: "DELETE", path, ...options });
  }

  return { request, get, post, patch, del };
}

/** Type of the HTTP client instance returned by createHttpClient. */
export type HttpClient = ReturnType<typeof createHttpClient>;

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a full URL from base, path, and optional query parameters.
 */
function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(path, baseUrl);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Parses the response body as JSON. Returns an empty object for 204 No Content.
 */
async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return {};
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  // Attempt JSON parse for responses without explicit content-type
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Handles non-2xx responses by parsing the error body and throwing
 * the appropriate custom error class.
 */
async function handleErrorResponse(response: Response): Promise<never> {
  const status = response.status;
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new ApiError(status, "unknown", `HTTP ${status}: ${response.statusText}`);
  }

  switch (status) {
    case 400:
      throw new ApiError(
        400,
        getErrorCode(body, "invalid_params"),
        getErrorMessage(body)
      );

    case 401:
      throw new AuthenticationError(
        getAuthErrorCode(body),
        getErrorMessage(body)
      );

    case 403:
      throw new AuthorizationError(getErrorMessage(body));

    case 404:
      throw new NotFoundError(getErrorMessage(body));

    case 422:
      // Check if it's a validation error with field-level errors array
      if (isValidationErrorBody(body)) {
        throw new ValidationError(
          (body as { errors: Array<{ field: string; message: string }> }).errors,
          "Validation failed"
        );
      }
      // Otherwise it might be a single error like "invalid_file"
      throw new ApiError(
        422,
        getErrorCode(body, "invalid_file"),
        getErrorMessage(body)
      );

    default:
      throw new ApiError(
        status,
        getErrorCode(body, "unknown"),
        getErrorMessage(body)
      );
  }
}

/**
 * Extracts the error code from a response body, falling back to a default.
 */
function getErrorCode(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body && typeof (body as Record<string, unknown>).error === "string") {
    return (body as { error: string }).error;
  }
  return fallback;
}

/**
 * Extracts the appropriate 401 error code from the response body.
 */
function getAuthErrorCode(body: unknown): Extract<ErrorCode, "unauthorized" | "token_expired" | "token_invalid"> {
  const code = getErrorCode(body, "unauthorized");
  if (code === "token_expired" || code === "token_invalid") {
    return code;
  }
  return "unauthorized";
}

/**
 * Extracts a human-readable message from an error body or unknown value.
 */
function getErrorMessage(body: unknown): string {
  if (body && typeof body === "object" && "message" in body && typeof (body as Record<string, unknown>).message === "string") {
    return (body as { message: string }).message;
  }
  if (body instanceof Error) {
    return body.message;
  }
  if (typeof body === "string") {
    return body;
  }
  return "An unexpected error occurred";
}

/**
 * Checks if the response body matches the validation error structure
 * (has an `errors` array with field/message entries).
 */
function isValidationErrorBody(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  if (!("errors" in body)) return false;
  const errors = (body as { errors: unknown }).errors;
  if (!Array.isArray(errors) || errors.length === 0) return false;
  return errors.every(
    (e) =>
      e &&
      typeof e === "object" &&
      "field" in e &&
      "message" in e &&
      typeof (e as Record<string, unknown>).field === "string" &&
      typeof (e as Record<string, unknown>).message === "string"
  );
}
