/**
 * Authentication API Zod validation schemas
 * @module api/schemas/auth
 */

import { z } from "zod";
import type { LoginRequest, LoginResponse, SessionResponse, UserObject } from "../types/auth";

/** User role enum values */
const userRoleEnum = z.enum(["client", "technician", "admin"]);

/** Schema for UserObject */
export const userObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: userRoleEnum,
  avatar_url: z.string(),
}) satisfies z.ZodType<UserObject>;

/** Schema for POST /api/auth/login request body */
export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
}) satisfies z.ZodType<LoginRequest>;

/** Schema for POST /api/auth/login response (200) */
export const loginResponseSchema = z.object({
  token: z.string().min(1),
  user: userObjectSchema,
  expires_at: z.string().datetime(),
}) satisfies z.ZodType<LoginResponse>;

/** Schema for GET /api/auth/me response (200) */
export const sessionResponseSchema = z.object({
  user: userObjectSchema,
}) satisfies z.ZodType<SessionResponse>;

/** Schema for JWT payload */
export const jwtPayloadSchema = z.object({
  sub: z.string(),
  role: userRoleEnum,
  iat: z.number().int(),
  exp: z.number().int(),
}).refine((data) => data.exp > data.iat, {
  message: "exp must be greater than iat",
});
