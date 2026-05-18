/**
 * Error response API contract types
 * @module api/types/errors
 */

/** Standard error response body */
export interface ErrorResponse {
  error: string; // machine-readable code
  message: string; // human-readable description
}

/** Validation error response body (HTTP 422) */
export interface ValidationErrorResponse {
  errors: ValidationError[];
}

/** Individual validation error entry */
export interface ValidationError {
  field: string;
  message: string;
}

/** All possible API error codes */
export type ErrorCode =
  | "unauthorized" // 401 - no token
  | "token_expired" // 401 - expired JWT
  | "token_invalid" // 401 - malformed JWT
  | "forbidden" // 403 - insufficient role
  | "not_found" // 404 - resource not found
  | "invalid_params" // 400 - missing/invalid query params
  | "invalid_file" // 422 - file too large or wrong format
  | "authentication_failed"; // WS close 4001
