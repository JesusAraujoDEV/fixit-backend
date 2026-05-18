/**
 * Authentication API contract types
 * @module api/types/auth
 */

/** POST /api/auth/login - Request body */
export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /api/auth/login - Response (200) */
export interface LoginResponse {
  token: string;
  user: UserObject;
  expires_at: string; // ISO-8601
}

/** GET /api/auth/me - Response (200) */
export interface SessionResponse {
  user: UserObject;
}

/** User object returned in auth responses */
export interface UserObject {
  id: string;
  name: string;
  email: string;
  role: "client" | "technician" | "admin";
  avatar_url: string;
}

/** JWT token payload structure */
export interface JWTPayload {
  sub: string; // user ID
  role: "client" | "technician" | "admin";
  iat: number; // issued-at Unix timestamp
  exp: number; // expiration Unix timestamp
}

/** Valid user roles */
export type UserRole = "client" | "technician" | "admin";
