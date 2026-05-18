/**
 * Unit tests for the technician service API functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTechnicianService } from "./technician.service";
import { ApiError } from "../client/errors";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { "content-type": "application/json" },
  });
}

describe("TechnicianService", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("updateAvailability", () => {
    it("sends PATCH request to /api/technician/availability with valid body", async () => {
      const responseBody = { online: true, updated_at: "2024-01-15T10:30:00.000Z" };
      mockFetch.mockResolvedValueOnce(jsonResponse(responseBody));

      const { createHttpClient } = await import("../client/http-client");
      const httpClient = createHttpClient({
        baseUrl: "http://localhost:3000",
        tokenProvider: () => "test-token",
      });
      const service = createTechnicianService({ httpClient });

      const result = await service.updateAvailability({
        online: true,
        lat: 19.4326,
        lng: -99.1332,
      });

      expect(result).toEqual(responseBody);
      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/api/technician/availability");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({
        online: true,
        lat: 19.4326,
        lng: -99.1332,
      });
    });

    it("returns the response with online=false when toggling offline", async () => {
      const responseBody = { online: false, updated_at: "2024-01-15T11:00:00.000Z" };
      mockFetch.mockResolvedValueOnce(jsonResponse(responseBody));

      const { createHttpClient } = await import("../client/http-client");
      const httpClient = createHttpClient({
        baseUrl: "http://localhost:3000",
        tokenProvider: () => "test-token",
      });
      const service = createTechnicianService({ httpClient });

      const result = await service.updateAvailability({
        online: false,
        lat: 20.0,
        lng: -100.0,
      });

      expect(result.online).toBe(false);
      expect(result.updated_at).toBe("2024-01-15T11:00:00.000Z");
    });

    it("throws ApiError when request body has invalid online field", async () => {
      const { createHttpClient } = await import("../client/http-client");
      const httpClient = createHttpClient({ baseUrl: "http://localhost:3000" });
      const service = createTechnicianService({ httpClient });

      await expect(
        service.updateAvailability({ online: "yes" as unknown as boolean, lat: 19.4, lng: -99.1 })
      ).rejects.toThrow(ApiError);

      try {
        await service.updateAvailability({ online: "yes" as unknown as boolean, lat: 19.4, lng: -99.1 });
      } catch (err) {
        expect((err as ApiError).code).toBe("invalid_request_body");
        expect((err as ApiError).statusCode).toBe(400);
      }
    });

    it("throws ApiError when request body has invalid lat field", async () => {
      const { createHttpClient } = await import("../client/http-client");
      const httpClient = createHttpClient({ baseUrl: "http://localhost:3000" });
      const service = createTechnicianService({ httpClient });

      await expect(
        service.updateAvailability({ online: true, lat: "abc" as unknown as number, lng: -99.1 })
      ).rejects.toThrow(ApiError);
    });

    it("throws ApiError when request body has invalid lng field", async () => {
      const { createHttpClient } = await import("../client/http-client");
      const httpClient = createHttpClient({ baseUrl: "http://localhost:3000" });
      const service = createTechnicianService({ httpClient });

      await expect(
        service.updateAvailability({ online: true, lat: 19.4, lng: undefined as unknown as number })
      ).rejects.toThrow(ApiError);
    });

    it("throws ApiError when response does not match expected schema", async () => {
      // Response missing updated_at field
      mockFetch.mockResolvedValueOnce(jsonResponse({ online: true }));

      const { createHttpClient } = await import("../client/http-client");
      const httpClient = createHttpClient({
        baseUrl: "http://localhost:3000",
        tokenProvider: () => "test-token",
      });
      const service = createTechnicianService({ httpClient });

      await expect(
        service.updateAvailability({ online: true, lat: 19.4, lng: -99.1 })
      ).rejects.toThrow(ApiError);
    });

    it("does not send request when body validation fails", async () => {
      const { createHttpClient } = await import("../client/http-client");
      const httpClient = createHttpClient({ baseUrl: "http://localhost:3000" });
      const service = createTechnicianService({ httpClient });

      try {
        await service.updateAvailability({ online: 123 as unknown as boolean, lat: 19.4, lng: -99.1 });
      } catch {
        // expected
      }

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("injects authorization token in the request", async () => {
      const responseBody = { online: true, updated_at: "2024-01-15T10:30:00.000Z" };
      mockFetch.mockResolvedValueOnce(jsonResponse(responseBody));

      const { createHttpClient } = await import("../client/http-client");
      const httpClient = createHttpClient({
        baseUrl: "http://localhost:3000",
        tokenProvider: () => "technician-jwt-token",
      });
      const service = createTechnicianService({ httpClient });

      await service.updateAvailability({ online: true, lat: 19.4, lng: -99.1 });

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["Authorization"]).toBe("Bearer technician-jwt-token");
    });
  });
});
