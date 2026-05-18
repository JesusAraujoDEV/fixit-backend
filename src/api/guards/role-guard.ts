/**
 * Role-Based Access Control (RBAC) guard utilities for the FixIt API client layer.
 *
 * Provides client-side role validation that checks JWT role claims against
 * endpoint requirements before making API calls. Throws appropriate errors
 * when access is denied.
 *
 * @module api/guards/role-guard
 */

import { AuthenticationError, AuthorizationError } from "../client/errors";
import type { UserRole, JWTPayload } from "../types/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Function that returns the current JWT token string, or null if unauthenticated. */
export type TokenProvider = () => string | null | Promise<string | null>;

/** Decoded JWT payload with at minimum the role claim. */
export interface DecodedToken {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** Endpoint group identifier for role mapping. */
export type EndpointGroup =
  | "client"
  | "technician"
  | "admin"
  | "shared"
  | "map-technicians";

// ---------------------------------------------------------------------------
// Role-to-Endpoint Mapping
// ---------------------------------------------------------------------------

/**
 * Maps endpoint groups to the roles allowed to access them.
 *
 * - Client endpoints: requests, map/requests
 * - Technician endpoints: jobs, availability, map/heatmap
 * - Admin endpoints: admin/*
 * - Shared endpoints: auth/me (all roles)
 * - Map technicians: client, admin
 */
export const ROLE_ENDPOINT_MAP: Record<EndpointGroup, UserRole[]> = {
  client: ["client"],
  technician: ["technician"],
  admin: ["admin"],
  shared: ["client", "technician", "admin"],
  "map-technicians": ["client", "admin"],
} as const;

/**
 * Maps API path patterns to their endpoint groups for automatic role resolution.
 * Patterns are matched in order; first match wins.
 */
export const ENDPOINT_ROLE_PATTERNS: Array<{
  pattern: RegExp;
  allowedRoles: UserRole[];
}> = [
  // Shared endpoints (must be before more specific patterns)
  { pattern: /^\/api\/auth\/me$/, allowedRoles: ROLE_ENDPOINT_MAP.shared },

  // Client endpoints
  { pattern: /^\/api\/requests/, allowedRoles: ROLE_ENDPOINT_MAP.client },
  { pattern: /^\/api\/map\/requests$/, allowedRoles: ROLE_ENDPOINT_MAP.client },

  // Technician endpoints
  { pattern: /^\/api\/jobs/, allowedRoles: ROLE_ENDPOINT_MAP.technician },
  {
    pattern: /^\/api\/technician\/availability$/,
    allowedRoles: ROLE_ENDPOINT_MAP.technician,
  },
  {
    pattern: /^\/api\/map\/heatmap$/,
    allowedRoles: ROLE_ENDPOINT_MAP.technician,
  },

  // Map technicians (client + admin)
  {
    pattern: /^\/api\/map\/technicians$/,
    allowedRoles: ROLE_ENDPOINT_MAP["map-technicians"],
  },

  // Admin endpoints (catch-all for /api/admin/*)
  { pattern: /^\/api\/admin\//, allowedRoles: ROLE_ENDPOINT_MAP.admin },
];

// ---------------------------------------------------------------------------
// Guard Functions
// ---------------------------------------------------------------------------

/**
 * Validates that a given role is included in the list of allowed roles.
 * Throws AuthorizationError if the role is not permitted.
 *
 * @param userRole - The role from the JWT claim.
 * @param allowedRoles - The roles permitted for the endpoint.
 * @throws {AuthorizationError} If the user's role is not in the allowed list.
 */
export function requireRole(
  userRole: UserRole | undefined | null,
  allowedRoles: UserRole[]
): void {
  if (!userRole) {
    throw new AuthenticationError(
      "unauthorized",
      "No role found in token. Authentication required."
    );
  }

  if (!allowedRoles.includes(userRole)) {
    throw new AuthorizationError(
      `Access denied. Role "${userRole}" is not authorized for this endpoint. Required: ${allowedRoles.join(", ")}`
    );
  }
}

/**
 * Resolves the allowed roles for a given API path by matching against
 * known endpoint patterns.
 *
 * @param path - The API endpoint path (e.g., "/api/admin/transactions").
 * @returns The allowed roles for the endpoint, or null if no pattern matches.
 */
export function resolveEndpointRoles(path: string): UserRole[] | null {
  for (const { pattern, allowedRoles } of ENDPOINT_ROLE_PATTERNS) {
    if (pattern.test(path)) {
      return allowedRoles;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Token Decoding
// ---------------------------------------------------------------------------

/**
 * Decodes a JWT token payload without verifying the signature.
 * This is intended for client-side role extraction only — actual
 * signature verification happens server-side.
 *
 * @param token - The raw JWT string.
 * @returns The decoded payload.
 * @throws {AuthenticationError} If the token is malformed or cannot be decoded.
 */
export function decodeTokenPayload(token: string): DecodedToken {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new AuthenticationError(
        "token_invalid",
        "Malformed JWT: expected 3 parts"
      );
    }

    const payload = JSON.parse(atob(parts[1])) as DecodedToken;

    if (!payload.sub || !payload.role || !payload.exp || !payload.iat) {
      throw new AuthenticationError(
        "token_invalid",
        "JWT payload missing required claims (sub, role, iat, exp)"
      );
    }

    const validRoles: UserRole[] = ["client", "technician", "admin"];
    if (!validRoles.includes(payload.role)) {
      throw new AuthenticationError(
        "token_invalid",
        `Invalid role claim: "${payload.role}"`
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError(
      "token_invalid",
      "Failed to decode JWT token"
    );
  }
}

// ---------------------------------------------------------------------------
// Guard Factory
// ---------------------------------------------------------------------------

/**
 * Creates a role guard function bound to a token provider.
 *
 * The returned guard can be called before API requests to ensure the
 * current user has the required role. It handles:
 * - Retrieving the token from the provider
 * - Throwing AuthenticationError if no token is available
 * - Decoding the token to extract the role claim
 * - Throwing AuthorizationError if the role doesn't match
 *
 * @param tokenProvider - A function that returns the current JWT token.
 * @returns A guard function that validates role access.
 *
 * @example
 * ```ts
 * const guard = createRoleGuard(() => localStorage.getItem("token"));
 *
 * // Guard a specific endpoint with explicit roles
 * await guard.requireRole(["admin"]);
 *
 * // Guard based on endpoint path (auto-resolves roles)
 * await guard.requireEndpointAccess("/api/admin/transactions");
 * ```
 */
export function createRoleGuard(tokenProvider: TokenProvider) {
  /**
   * Retrieves and decodes the current token from the provider.
   *
   * @throws {AuthenticationError} If no token is available.
   * @returns The decoded token payload.
   */
  async function getDecodedToken(): Promise<DecodedToken> {
    const token = await tokenProvider();

    if (!token) {
      throw new AuthenticationError(
        "unauthorized",
        "Authentication required. No token provided."
      );
    }

    return decodeTokenPayload(token);
  }

  /**
   * Validates that the current user has one of the specified roles.
   *
   * @param allowedRoles - The roles permitted for the operation.
   * @throws {AuthenticationError} If no token is available.
   * @throws {AuthorizationError} If the user's role is not in the allowed list.
   */
  async function checkRole(allowedRoles: UserRole[]): Promise<void> {
    const decoded = await getDecodedToken();
    requireRole(decoded.role, allowedRoles);
  }

  /**
   * Validates that the current user can access the given endpoint path.
   * Resolves allowed roles from the endpoint pattern mapping.
   *
   * @param path - The API endpoint path.
   * @throws {AuthenticationError} If no token is available.
   * @throws {AuthorizationError} If the user's role is not permitted for the endpoint.
   */
  async function requireEndpointAccess(path: string): Promise<void> {
    const allowedRoles = resolveEndpointRoles(path);

    if (!allowedRoles) {
      // If no pattern matches, the endpoint is considered unprotected
      // or requires authentication only (no specific role)
      await getDecodedToken();
      return;
    }

    await checkRole(allowedRoles);
  }

  return {
    checkRole,
    requireEndpointAccess,
    getDecodedToken,
  };
}

/** Type of the role guard instance returned by createRoleGuard. */
export type RoleGuard = ReturnType<typeof createRoleGuard>;
