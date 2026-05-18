/**
 * Custom error classes for the FixIt API client layer.
 *
 * These classes provide structured error handling with typed error codes,
 * HTTP status information, and optional validation details.
 *
 * @module api/client/errors
 */

import type { ErrorCode, ValidationError as ValidationErrorEntry } from "../types/errors";

// ---------------------------------------------------------------------------
// Base API Error
// ---------------------------------------------------------------------------

/**
 * Base error class for all API-related errors.
 * Carries the HTTP status code, machine-readable error code, and
 * human-readable message from the server response.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Authentication Error (401)
// ---------------------------------------------------------------------------

/**
 * Thrown when the server returns HTTP 401.
 * The `code` field distinguishes between "unauthorized", "token_expired",
 * and "token_invalid".
 */
export class AuthenticationError extends ApiError {
  constructor(code: Extract<ErrorCode, "unauthorized" | "token_expired" | "token_invalid">, message: string) {
    super(401, code, message);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Authorization Error (403)
// ---------------------------------------------------------------------------

/**
 * Thrown when the server returns HTTP 403 (forbidden).
 * Indicates the authenticated user lacks the required role for the endpoint.
 */
export class AuthorizationError extends ApiError {
  constructor(message: string) {
    super(403, "forbidden", message);
    this.name = "AuthorizationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Validation Error (422)
// ---------------------------------------------------------------------------

/**
 * Thrown when the server returns HTTP 422 with field-level validation errors.
 * Carries the structured `errors` array from the response body.
 */
export class ValidationError extends ApiError {
  public readonly errors: ValidationErrorEntry[];

  constructor(errors: ValidationErrorEntry[], message?: string) {
    super(422, "validation_error", message ?? "Validation failed");
    this.name = "ValidationError";
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Not Found Error (404)
// ---------------------------------------------------------------------------

/**
 * Thrown when the server returns HTTP 404.
 * Indicates the requested resource does not exist.
 */
export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, "not_found", message);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
