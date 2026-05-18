/**
 * Unit tests for the jobs service.
 * @module api/services/jobs.service.test
 */

import { describe, it, expect, vi } from "vitest";
import { createJobsService } from "./jobs.service";
import type { HttpClient } from "../client/http-client";
import type { AvailableJob, CompletedJob } from "../types/jobs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockClient(overrides: Partial<HttpClient> = {}): HttpClient {
  return {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

const mockAvailableJobs: AvailableJob[] = [
  {
    id: "job-001",
    category: "plumbing",
    title: "Fix leaking pipe",
    distance_km: 1.2,
    expires_in_min: 15,
    payout: "$80–120",
    urgent: true,
  },
  {
    id: "job-002",
    category: "electrical",
    title: "Install outlet",
    distance_km: 3.5,
    expires_in_min: 30,
    payout: "$50–80",
    urgent: false,
  },
];

const mockCompletedJobs: CompletedJob[] = [
  {
    id: "job-010",
    title: "Replaced water heater",
    earnings: "$200",
    rating: 5,
    completed_at: "2024-01-14T16:00:00.000Z",
  },
  {
    id: "job-011",
    title: "Fixed AC unit",
    earnings: "$150",
    rating: 4,
    completed_at: "2024-01-12T11:30:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createJobsService", () => {
  describe("getAvailableJobs", () => {
    it("sends GET to /api/jobs/available with lat and lng params", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockAvailableJobs);
      const client = createMockClient({ get: mockGet });
      const service = createJobsService(client);

      const result = await service.getAvailableJobs({ lat: 19.4326, lng: -99.1332 });

      expect(mockGet).toHaveBeenCalledWith(
        "/api/jobs/available",
        expect.objectContaining({
          params: { lat: 19.4326, lng: -99.1332, category: undefined },
          schema: expect.anything(),
        })
      );
      expect(result).toEqual(mockAvailableJobs);
    });

    it("includes category filter when provided", async () => {
      const mockGet = vi.fn().mockResolvedValue([mockAvailableJobs[0]]);
      const client = createMockClient({ get: mockGet });
      const service = createJobsService(client);

      await service.getAvailableJobs({ lat: 19.4, lng: -99.1, category: "plumbing" });

      expect(mockGet).toHaveBeenCalledWith(
        "/api/jobs/available",
        expect.objectContaining({
          params: { lat: 19.4, lng: -99.1, category: "plumbing" },
        })
      );
    });

    it("validates response with z.array(availableJobSchema)", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockAvailableJobs);
      const client = createMockClient({ get: mockGet });
      const service = createJobsService(client);

      await service.getAvailableJobs({ lat: 19.4, lng: -99.1 });

      const callArgs = mockGet.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("schema");
    });

    it("returns empty array when no jobs available", async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      const client = createMockClient({ get: mockGet });
      const service = createJobsService(client);

      const result = await service.getAvailableJobs({ lat: 19.4, lng: -99.1 });

      expect(result).toEqual([]);
    });
  });

  describe("getCompletedJobs", () => {
    it("sends GET to /api/jobs/completed without params when none provided", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockCompletedJobs);
      const client = createMockClient({ get: mockGet });
      const service = createJobsService(client);

      const result = await service.getCompletedJobs();

      expect(mockGet).toHaveBeenCalledWith(
        "/api/jobs/completed",
        expect.objectContaining({
          params: { date_from: undefined, date_to: undefined },
          schema: expect.anything(),
        })
      );
      expect(result).toEqual(mockCompletedJobs);
    });

    it("passes date_from filter", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockCompletedJobs);
      const client = createMockClient({ get: mockGet });
      const service = createJobsService(client);

      await service.getCompletedJobs({ date_from: "2024-01-01" });

      expect(mockGet).toHaveBeenCalledWith(
        "/api/jobs/completed",
        expect.objectContaining({
          params: { date_from: "2024-01-01", date_to: undefined },
        })
      );
    });

    it("passes date_to filter", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockCompletedJobs);
      const client = createMockClient({ get: mockGet });
      const service = createJobsService(client);

      await service.getCompletedJobs({ date_to: "2024-01-31" });

      expect(mockGet).toHaveBeenCalledWith(
        "/api/jobs/completed",
        expect.objectContaining({
          params: { date_from: undefined, date_to: "2024-01-31" },
        })
      );
    });

    it("passes both date_from and date_to filters", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockCompletedJobs);
      const client = createMockClient({ get: mockGet });
      const service = createJobsService(client);

      await service.getCompletedJobs({ date_from: "2024-01-01", date_to: "2024-01-31" });

      expect(mockGet).toHaveBeenCalledWith(
        "/api/jobs/completed",
        expect.objectContaining({
          params: { date_from: "2024-01-01", date_to: "2024-01-31" },
        })
      );
    });

    it("validates response with z.array(completedJobSchema)", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockCompletedJobs);
      const client = createMockClient({ get: mockGet });
      const service = createJobsService(client);

      await service.getCompletedJobs();

      const callArgs = mockGet.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("schema");
    });

    it("returns empty array when no completed jobs", async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      const client = createMockClient({ get: mockGet });
      const service = createJobsService(client);

      const result = await service.getCompletedJobs();

      expect(result).toEqual([]);
    });
  });
});
