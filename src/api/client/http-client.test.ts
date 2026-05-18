/**
 * Unit tests for the HTTP client wrapper.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { createHttpClient } from "./http-client";
import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "./errors";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

describe("createHttpClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("request basics", () => {
    it("makes a GET request to the correct URL", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await client.get("/api/auth/me");

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/api/auth/me");
      expect(init.method).toBe("GET");
    });

    it("appends query parameters to the URL", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await client.get("/api/map/requests", {
        params: { lat: 19.4326, lng: -99.1332, radius_km: 5 },
      });

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("lat")).toBe("19.4326");
      expect(parsed.searchParams.get("lng")).toBe("-99.1332");
      expect(parsed.searchParams.get("radius_km")).toBe("5");
    });

    it("omits undefined query parameters", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await client.get("/api/jobs/available", {
        params: { lat: 19.4, lng: -99.1, category: undefined },
      });

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.has("category")).toBe(false);
    });

    it("sends JSON body for POST requests", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "123" }, 201));
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await client.post("/api/requests", { title: "Fix my sink" });

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("POST");
      expect(init.body).toBe(JSON.stringify({ title: "Fix my sink" }));
    });

    it("sends JSON body for PATCH requests", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ online: true }));
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await client.patch("/api/technician/availability", { online: true, lat: 19.4, lng: -99.1 });

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("PATCH");
    });

    it("makes DELETE requests", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await client.del("/api/requests/123");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("DELETE");
    });
  });

  describe("JWT token injection", () => {
    it("injects Bearer token from synchronous provider", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ user: {} }));
      const client = createHttpClient({
        baseUrl: "http://localhost:3000",
        tokenProvider: () => "my-jwt-token",
      });

      await client.get("/api/auth/me");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["Authorization"]).toBe("Bearer my-jwt-token");
    });

    it("injects Bearer token from async provider", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ user: {} }));
      const client = createHttpClient({
        baseUrl: "http://localhost:3000",
        tokenProvider: async () => "async-token",
      });

      await client.get("/api/auth/me");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["Authorization"]).toBe("Bearer async-token");
    });

    it("does not inject Authorization header when token is null", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));
      const client = createHttpClient({
        baseUrl: "http://localhost:3000",
        tokenProvider: () => null,
      });

      await client.get("/api/auth/login");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["Authorization"]).toBeUndefined();
    });

    it("does not inject Authorization header when no token provider", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await client.get("/api/auth/login");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["Authorization"]).toBeUndefined();
    });
  });

  describe("response validation with Zod schemas", () => {
    it("validates response against provided schema", async () => {
      const schema = z.object({ id: z.string(), name: z.string() });
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "1", name: "Test" }));
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      const result = await client.get("/api/test", { schema });

      expect(result).toEqual({ id: "1", name: "Test" });
    });

    it("throws ApiError when response fails schema validation", async () => {
      const schema = z.object({ id: z.string(), name: z.string() });
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 123 })); // wrong type
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await expect(client.get("/api/test", { schema })).rejects.toThrow(ApiError);
      await mockFetch.mockResolvedValueOnce(jsonResponse({ id: 123 }));
      try {
        await client.get("/api/test", { schema });
      } catch (err) {
        expect((err as ApiError).code).toBe("response_validation_error");
      }
    });

    it("returns raw data when no schema is provided", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ anything: true }));
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      const result = await client.get("/api/test");

      expect(result).toEqual({ anything: true });
    });
  });

  describe("error classification", () => {
    it("throws ApiError with invalid_params for HTTP 400", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "invalid_params", message: "lat is required" }, 400)
      );
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await expect(client.get("/api/map/requests")).rejects.toThrow(ApiError);
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "invalid_params", message: "lat is required" }, 400)
      );
      try {
        await client.get("/api/map/requests");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).statusCode).toBe(400);
        expect((err as ApiError).code).toBe("invalid_params");
      }
    });

    it("throws AuthenticationError with unauthorized for HTTP 401", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "unauthorized", message: "No token" }, 401)
      );
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await expect(client.get("/api/auth/me")).rejects.toThrow(AuthenticationError);
    });

    it("throws AuthenticationError with token_expired for HTTP 401", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "token_expired", message: "Token expired" }, 401)
      );
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      try {
        await client.get("/api/auth/me");
      } catch (err) {
        expect(err).toBeInstanceOf(AuthenticationError);
        expect((err as AuthenticationError).code).toBe("token_expired");
      }
    });

    it("throws AuthenticationError with token_invalid for HTTP 401", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "token_invalid", message: "Malformed" }, 401)
      );
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      try {
        await client.get("/api/auth/me");
      } catch (err) {
        expect(err).toBeInstanceOf(AuthenticationError);
        expect((err as AuthenticationError).code).toBe("token_invalid");
      }
    });

    it("throws AuthorizationError for HTTP 403", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "forbidden", message: "Insufficient role" }, 403)
      );
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await expect(client.get("/api/admin/kpis")).rejects.toThrow(AuthorizationError);
    });

    it("throws NotFoundError for HTTP 404", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "not_found", message: "Verification not found" }, 404)
      );
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await expect(client.get("/api/admin/verifications/xyz")).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError with field errors for HTTP 422 with errors array", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          { errors: [{ field: "title", message: "Too short" }] },
          422
        )
      );
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      try {
        await client.post("/api/requests", {});
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).errors).toEqual([
          { field: "title", message: "Too short" },
        ]);
      }
    });

    it("throws ApiError with invalid_file for HTTP 422 without errors array", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "invalid_file", message: "File too large" }, 422)
      );
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      try {
        await client.post("/api/ai/diagnose", {});
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("invalid_file");
        expect(err).not.toBeInstanceOf(ValidationError);
      }
    });
  });

  describe("timeout handling", () => {
    it("throws ApiError with timeout code when request exceeds timeout", async () => {
      mockFetch.mockImplementationOnce((_url: string, init: { signal: AbortSignal }) => {
        return new Promise((_, reject) => {
          init.signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
      });
      const client = createHttpClient({
        baseUrl: "http://localhost:3000",
        defaultTimeoutMs: 50,
      });

      try {
        await client.get("/api/slow");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("timeout");
      }
    });
  });

  describe("default headers", () => {
    it("sends Content-Type and Accept headers by default", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await client.get("/api/test");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["Content-Type"]).toBe("application/json");
      expect(init.headers["Accept"]).toBe("application/json");
    });

    it("allows overriding headers per request", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));
      const client = createHttpClient({ baseUrl: "http://localhost:3000" });

      await client.request({
        method: "POST",
        path: "/api/test",
        headers: { "X-Custom": "value" },
      });

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["X-Custom"]).toBe("value");
      expect(init.headers["Content-Type"]).toBe("application/json");
    });
  });
});
