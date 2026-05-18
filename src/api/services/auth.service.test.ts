/**
 * Unit tests for the authentication service.
 * @module api/services/auth.service.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthService } from "./auth.service";
import { AuthenticationError, ApiError } from "../client/errors";
import type { HttpClient } from "../client/http-client";
import type { LoginResponse, SessionResponse } from "../types/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Valid login response fixture */
const validLoginResponse: LoginResponse = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
  user: {
    id: "user-123",
    name: "John Doe",
    email: "john@example.com",
    role: "client",
    avatar_url: "https://example.com/avatar.png",
  },
  expires_at: "2025-01-01T12:00:00.000Z",
};

/** Valid session response fixture */
const validSessionResponse: SessionResponse = {
  user: {
    id: "user-123",
    name: "John Doe",
    email: "john@example.com",
    role: "client",
    avatar_url: "https://example.com/avatar.png",
  },
};

/**
 * Creates a mock HTTP client for testing.
 */
function createMockHttpClient(overrides: {
  post?: ReturnType<typeof vi.fn>;
  get?: ReturnType<typeof vi.fn>;
} = {}): HttpClient {
  return {
    request: vi.fn(),
    get: overrides.get ?? vi.fn(),
    post: overrides.post ?? vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  } as unknown as HttpClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createAuthService", () => {
  describe("login", () => {
    it("should call POST /api/auth/login with credentials and return validated response", async () => {
      const mockPost = vi.fn().mockResolvedValue(validLoginResponse);
      const mockClient = createMockHttpClient({ post: mockPost });

      const authService = createAuthService({ httpClient: mockClient });

      const result = await authService.login({
        email: "john@example.com",
        password: "secret123",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/api/auth/login",
        { email: "john@example.com", password: "secret123" },
        expect.objectContaining({ schema: expect.anything() })
      );
      expect(result).toEqual(validLoginResponse);
    });

    it("should propagate AuthenticationError on 401 (invalid credentials)", async () => {
      const mockPost = vi.fn().mockRejectedValue(
        new AuthenticationError("unauthorized", "Invalid email or password")
      );
      const mockClient = createMockHttpClient({ post: mockPost });

      const authService = createAuthService({ httpClient: mockClient });

      await expect(
        authService.login({ email: "bad@example.com", password: "wrong" })
      ).rejects.toThrow(AuthenticationError);
    });

    it("should propagate AuthenticationError with token_invalid code", async () => {
      const mockPost = vi.fn().mockRejectedValue(
        new AuthenticationError("token_invalid", "Malformed token")
      );
      const mockClient = createMockHttpClient({ post: mockPost });

      const authService = createAuthService({ httpClient: mockClient });

      await expect(
        authService.login({ email: "test@example.com", password: "pass" })
      ).rejects.toMatchObject({
        code: "token_invalid",
        statusCode: 401,
      });
    });

    it("should propagate ApiError on network failure", async () => {
      const mockPost = vi.fn().mockRejectedValue(
        new ApiError(0, "network_error", "Failed to fetch")
      );
      const mockClient = createMockHttpClient({ post: mockPost });

      const authService = createAuthService({ httpClient: mockClient });

      await expect(
        authService.login({ email: "test@example.com", password: "pass" })
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getSession", () => {
    it("should call GET /api/auth/me and return validated session response", async () => {
      const mockGet = vi.fn().mockResolvedValue(validSessionResponse);
      const mockClient = createMockHttpClient({ get: mockGet });

      const authService = createAuthService({ httpClient: mockClient });

      const result = await authService.getSession();

      expect(mockGet).toHaveBeenCalledWith(
        "/api/auth/me",
        expect.objectContaining({ schema: expect.anything() })
      );
      expect(result).toEqual(validSessionResponse);
    });

    it("should propagate AuthenticationError when token is expired (401)", async () => {
      const mockGet = vi.fn().mockRejectedValue(
        new AuthenticationError("token_expired", "Token has expired")
      );
      const mockClient = createMockHttpClient({ get: mockGet });

      const authService = createAuthService({ httpClient: mockClient });

      await expect(authService.getSession()).rejects.toMatchObject({
        code: "token_expired",
        statusCode: 401,
      });
    });

    it("should propagate AuthenticationError when no token is provided (401)", async () => {
      const mockGet = vi.fn().mockRejectedValue(
        new AuthenticationError("unauthorized", "No authorization header")
      );
      const mockClient = createMockHttpClient({ get: mockGet });

      const authService = createAuthService({ httpClient: mockClient });

      await expect(authService.getSession()).rejects.toMatchObject({
        code: "unauthorized",
        statusCode: 401,
      });
    });

    it("should propagate AuthenticationError with token_invalid code", async () => {
      const mockGet = vi.fn().mockRejectedValue(
        new AuthenticationError("token_invalid", "JWT signature invalid")
      );
      const mockClient = createMockHttpClient({ get: mockGet });

      const authService = createAuthService({ httpClient: mockClient });

      await expect(authService.getSession()).rejects.toMatchObject({
        code: "token_invalid",
        statusCode: 401,
      });
    });
  });

  describe("factory configuration", () => {
    it("should accept a token provider for authenticated requests", () => {
      const tokenProvider = () => "my-jwt-token";
      const authService = createAuthService({ tokenProvider });

      expect(authService.login).toBeDefined();
      expect(authService.getSession).toBeDefined();
    });

    it("should work with default configuration (no token provider)", () => {
      const authService = createAuthService();

      expect(authService.login).toBeDefined();
      expect(authService.getSession).toBeDefined();
    });
  });
});
