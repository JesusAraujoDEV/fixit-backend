/**
 * Unit tests for the Map Service API client functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMapService } from "./map.service";
import { ApiError } from "../client/errors";
import { createHttpClient } from "../client/http-client";
import type { RequestMarker, TechnicianMarker, HeatmapZone } from "../types/map";

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

describe("createMapService", () => {
  let mapService: ReturnType<typeof createMapService>;

  beforeEach(() => {
    mockFetch.mockReset();
    const client = createHttpClient({
      baseUrl: "http://localhost:3000",
      tokenProvider: () => "test-token",
    });
    mapService = createMapService(client);
  });

  describe("getRequestMarkers", () => {
    const validParams = { lat: 19.4326, lng: -99.1332, radius_km: 5 };

    const validMarkers: RequestMarker[] = [
      {
        id: "req-1",
        position: [19.43, -99.13],
        label: "Fuga de agua en cocina",
        type: "request",
        category: "Plomería",
      },
      {
        id: "req-2",
        position: [19.44, -99.14],
        label: "Cortocircuito en sala",
        type: "request",
        category: "Electricidad",
      },
    ];

    it("returns request markers for valid params", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(validMarkers));

      const result = await mapService.getRequestMarkers(validParams);

      expect(result).toEqual(validMarkers);
    });

    it("sends correct query parameters", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await mapService.getRequestMarkers(validParams);

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/api/map/requests");
      expect(parsed.searchParams.get("lat")).toBe("19.4326");
      expect(parsed.searchParams.get("lng")).toBe("-99.1332");
      expect(parsed.searchParams.get("radius_km")).toBe("5");
    });

    it("throws ApiError(400) for non-numeric lat", async () => {
      await expect(
        mapService.getRequestMarkers({ lat: NaN, lng: -99.1332, radius_km: 5 })
      ).rejects.toThrow(ApiError);

      try {
        await mapService.getRequestMarkers({ lat: NaN, lng: -99.1332, radius_km: 5 });
      } catch (err) {
        expect((err as ApiError).statusCode).toBe(400);
        expect((err as ApiError).code).toBe("invalid_params");
      }
    });

    it("throws ApiError(400) for negative radius_km", async () => {
      await expect(
        mapService.getRequestMarkers({ lat: 19.4, lng: -99.1, radius_km: -1 })
      ).rejects.toThrow(ApiError);

      try {
        await mapService.getRequestMarkers({ lat: 19.4, lng: -99.1, radius_km: -1 });
      } catch (err) {
        expect((err as ApiError).statusCode).toBe(400);
        expect((err as ApiError).code).toBe("invalid_params");
      }
    });

    it("throws ApiError(400) for zero radius_km", async () => {
      await expect(
        mapService.getRequestMarkers({ lat: 19.4, lng: -99.1, radius_km: 0 })
      ).rejects.toThrow(ApiError);
    });

    it("validates response schema and throws on invalid data", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse([{ id: "req-1", position: "invalid" }])
      );

      await expect(mapService.getRequestMarkers(validParams)).rejects.toThrow(
        ApiError
      );
    });

    it("includes Authorization header", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await mapService.getRequestMarkers(validParams);

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["Authorization"]).toBe("Bearer test-token");
    });
  });

  describe("getTechnicianMarkers", () => {
    const validParams = { lat: 19.4326, lng: -99.1332, radius_km: 10 };

    const validMarkers: TechnicianMarker[] = [
      {
        id: "tech-1",
        position: [19.43, -99.13],
        label: "Carlos - Electricidad",
        type: "technician",
        status: "available",
      },
    ];

    it("returns technician markers for valid params", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(validMarkers));

      const result = await mapService.getTechnicianMarkers(validParams);

      expect(result).toEqual(validMarkers);
    });

    it("sends the 'all' query parameter when provided", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await mapService.getTechnicianMarkers({ ...validParams, all: "true" });

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("all")).toBe("true");
    });

    it("does not send 'all' parameter when not provided", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await mapService.getTechnicianMarkers(validParams);

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.has("all")).toBe(false);
    });

    it("throws ApiError(400) for invalid params", async () => {
      await expect(
        mapService.getTechnicianMarkers({ lat: 19.4, lng: -99.1, radius_km: -5 })
      ).rejects.toThrow(ApiError);
    });

    it("calls the correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await mapService.getTechnicianMarkers(validParams);

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/api/map/technicians");
    });
  });

  describe("getHeatmapZones", () => {
    const validParams = { lat: 19.4326, lng: -99.1332, radius_km: 15 };

    const validZones: HeatmapZone[] = [
      {
        id: "zone-1",
        center: [19.43, -99.13],
        radius_m: 500,
        intensity: 0.85,
        label: "Centro Histórico",
      },
      {
        id: "zone-2",
        center: [19.44, -99.14],
        radius_m: 300,
        intensity: 0.4,
        label: "Condesa",
      },
    ];

    it("returns heatmap zones for valid params", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(validZones));

      const result = await mapService.getHeatmapZones(validParams);

      expect(result).toEqual(validZones);
    });

    it("calls the correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await mapService.getHeatmapZones(validParams);

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/api/map/heatmap");
    });

    it("throws ApiError(400) for invalid params", async () => {
      await expect(
        mapService.getHeatmapZones({ lat: 19.4, lng: -99.1, radius_km: 0 })
      ).rejects.toThrow(ApiError);
    });

    it("validates response schema and throws on invalid intensity", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse([
          {
            id: "zone-1",
            center: [19.43, -99.13],
            radius_m: 500,
            intensity: 1.5, // invalid: > 1.0
            label: "Test",
          },
        ])
      );

      await expect(mapService.getHeatmapZones(validParams)).rejects.toThrow(
        ApiError
      );
    });

    it("validates response schema and throws on empty label", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse([
          {
            id: "zone-1",
            center: [19.43, -99.13],
            radius_m: 500,
            intensity: 0.5,
            label: "", // invalid: min 1 char
          },
        ])
      );

      await expect(mapService.getHeatmapZones(validParams)).rejects.toThrow(
        ApiError
      );
    });
  });
});
