/**
 * Authentication API service functions.
 *
 * Provides typed functions for the auth endpoints:
 * - POST /api/auth/login (unauthenticated)
 * - GET /api/auth/me (requires JWT)
 *
 * @module api/services/auth
 */

import { createHttpClient, type HttpClient, type TokenProvider } from "../client/http-client";
import { AUTH_ENDPOINTS } from "../client/config";
import { loginResponseSchema, sessionResponseSchema } from "../schemas/auth.schema";
import type { LoginRequest, LoginResponse, SessionResponse } from "../types/auth";

// ---------------------------------------------------------------------------
// Service Factory
// ---------------------------------------------------------------------------

export interface AuthServiceConfig {
  /** Token provider for authenticated requests (getSession). */
  tokenProvider?: TokenProvider | null;
  /** Optional pre-configured HTTP client (useful for testing). */
  httpClient?: HttpClient;
}

/**
 * Creates an authentication service instance.
 *
 * @param config - Optional configuration with token provider or pre-built client.
 * @returns Object with `login` and `getSession` methods.
 *
 * @example
 * ```ts
 * const authService = createAuthService({
 *   tokenProvider: () => localStorage.getItem("token"),
 * });
 *
 * const { token, user } = await authService.login({ email, password });
 * const session = await authService.getSession();
 * ```
 */
export function createAuthService(config: AuthServiceConfig = {}) {
  const { tokenProvider = null, httpClient } = config;

  // Login uses an unauthenticated client (no token injection)
  const publicClient = httpClient ?? createHttpClient({ tokenProvider: null });

  // getSession uses an authenticated client
  const authenticatedClient = httpClient ?? createHttpClient({ tokenProvider });

  /**
   * Authenticate a user with email and password.
   *
   * Sends credentials to POST /api/auth/login and validates the response
   * against the loginResponseSchema before returning.
   *
   * @param credentials - Email and password.
   * @returns Login response with token, user object, and expiration.
   * @throws {AuthenticationError} When credentials are invalid (HTTP 401).
   * @throws {ApiError} When response validation fails or network error occurs.
   */
  async function login(credentials: LoginRequest): Promise<LoginResponse> {
    return publicClient.post<LoginResponse>(AUTH_ENDPOINTS.LOGIN, credentials, {
      schema: loginResponseSchema,
    });
  }

  /**
   * Retrieve the current authenticated user's session.
   *
   * Sends a GET request to /api/auth/me with the JWT Bearer token
   * and validates the response against the sessionResponseSchema.
   *
   * @returns Session response containing the user object.
   * @throws {AuthenticationError} When token is missing, expired, or invalid (HTTP 401).
   * @throws {ApiError} When response validation fails or network error occurs.
   */
  async function getSession(): Promise<SessionResponse> {
    return authenticatedClient.get<SessionResponse>(AUTH_ENDPOINTS.ME, {
      schema: sessionResponseSchema,
    });
  }

  return { login, getSession };
}

/** Type of the auth service instance returned by createAuthService. */
export type AuthService = ReturnType<typeof createAuthService>;
