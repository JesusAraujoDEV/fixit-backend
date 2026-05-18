/**
 * Unit tests for the Admin Service API functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHttpClient } from "../client/http-client";
import { createAdminService } from "./admin.service";
import type {
  TransactionsResponse,
  TransactionSummary,
  Verification,
  PlatformEvent,
  KPIResponse,
  WeeklyPerformance,
} from "../types/admin";

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

describe("createAdminService", () => {
  let adminService: ReturnType<typeof createAdminService>;

  beforeEach(() => {
    mockFetch.mockReset();
    const client = createHttpClient({
      baseUrl: "http://localhost:3000",
      tokenProvider: () => "admin-token",
    });
    adminService = createAdminService(client);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getTransactions", () => {
    const mockTransactionsResponse: TransactionsResponse = {
      data: [
        {
          id: "txn-1",
          client: "John Doe",
          technician: "Jane Smith",
          service: "Plumbing",
          amount: "$150.00",
          commission: "$22.50",
          status: "completed",
          created_at: "2024-01-15T10:30:00Z",
        },
      ],
      total: 1,
      page: 1,
      per_page: 20,
    };

    it("fetches transactions without parameters", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockTransactionsResponse));

      const result = await adminService.getTransactions();

      expect(result).toEqual(mockTransactionsResponse);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/api/admin/transactions");
    });

    it("passes pagination parameters", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockTransactionsResponse));

      await adminService.getTransactions({ page: 2, per_page: 10 });

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("page")).toBe("2");
      expect(parsed.searchParams.get("per_page")).toBe("10");
    });

    it("passes filter parameters", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockTransactionsResponse));

      await adminService.getTransactions({
        status: "disputed",
        date_from: "2024-01-01",
        date_to: "2024-01-31",
      });

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("status")).toBe("disputed");
      expect(parsed.searchParams.get("date_from")).toBe("2024-01-01");
      expect(parsed.searchParams.get("date_to")).toBe("2024-01-31");
    });

    it("includes Authorization header", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockTransactionsResponse));

      await adminService.getTransactions();

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["Authorization"]).toBe("Bearer admin-token");
    });
  });

  describe("getTransactionSummary", () => {
    const mockSummary: TransactionSummary = {
      today_count: 42,
      today_volume: "$12,500",
      today_commission: "$1,875.00",
      disputes_pending: 3,
    };

    it("fetches transaction summary", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockSummary));

      const result = await adminService.getTransactionSummary();

      expect(result).toEqual(mockSummary);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(
        "http://localhost:3000/api/admin/transactions/summary"
      );
    });
  });

  describe("getVerifications", () => {
    const mockVerifications: Verification[] = [
      {
        id: "ver-1",
        name: "Carlos Mendez",
        specialty: "Electricidad",
        experience: "5 years",
        documents_count: 3,
        submitted_at: "2024-01-10T08:00:00Z",
      },
    ];

    it("fetches verifications without status filter", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockVerifications));

      const result = await adminService.getVerifications();

      expect(result).toEqual(mockVerifications);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/api/admin/verifications");
    });

    it("passes status filter parameter", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockVerifications));

      await adminService.getVerifications("pending");

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("status")).toBe("pending");
    });
  });

  describe("updateVerification", () => {
    const mockUpdatedVerification: Verification = {
      id: "ver-1",
      name: "Carlos Mendez",
      specialty: "Electricidad",
      experience: "5 years",
      documents_count: 3,
      submitted_at: "2024-01-10T08:00:00Z",
    };

    it("approves a verification", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockUpdatedVerification));

      const result = await adminService.updateVerification("ver-1", {
        action: "approve",
      });

      expect(result).toEqual(mockUpdatedVerification);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(
        "http://localhost:3000/api/admin/verifications/ver-1"
      );
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({ action: "approve" });
    });

    it("rejects a verification with reason", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockUpdatedVerification));

      await adminService.updateVerification("ver-1", {
        action: "reject",
        reason: "Incomplete documentation",
      });

      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body)).toEqual({
        action: "reject",
        reason: "Incomplete documentation",
      });
    });
  });

  describe("getEvents", () => {
    const mockEvents: PlatformEvent[] = [
      {
        id: "evt-1",
        time: "2024-01-15T12:00:00Z",
        type: "info",
        message: "New technician registered",
      },
      {
        id: "evt-2",
        time: "2024-01-15T11:55:00Z",
        type: "warning",
        message: "High demand in zone A",
      },
    ];

    it("fetches events without parameters", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockEvents));

      const result = await adminService.getEvents();

      expect(result).toEqual(mockEvents);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/api/admin/events");
    });

    it("passes limit and type parameters", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockEvents));

      await adminService.getEvents({ limit: 10, type: "warning" });

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("limit")).toBe("10");
      expect(parsed.searchParams.get("type")).toBe("warning");
    });
  });

  describe("getKPIs", () => {
    const mockKPIs: KPIResponse = {
      active_services: { value: 24, delta: "+12%" },
      technicians_online: { value: 18, delta: "+3" },
      revenue_today: { value: "$4,500", delta: "+8%" },
      reports_pending: { value: 5, delta: "-2" },
    };

    it("fetches KPI metrics", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockKPIs));

      const result = await adminService.getKPIs();

      expect(result).toEqual(mockKPIs);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/api/admin/kpis");
    });
  });

  describe("getWeeklyPerformance", () => {
    const mockPerformance: WeeklyPerformance = {
      days: [
        { label: "Mon", completed: 12, date: "2024-01-08" },
        { label: "Tue", completed: 15, date: "2024-01-09" },
        { label: "Wed", completed: 10, date: "2024-01-10" },
        { label: "Thu", completed: 18, date: "2024-01-11" },
        { label: "Fri", completed: 22, date: "2024-01-12" },
        { label: "Sat", completed: 8, date: "2024-01-13" },
        { label: "Sun", completed: 5, date: "2024-01-14" },
      ],
    };

    it("fetches weekly performance data", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(mockPerformance));

      const result = await adminService.getWeeklyPerformance();

      expect(result).toEqual(mockPerformance);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(
        "http://localhost:3000/api/admin/performance/weekly"
      );
    });
  });

  describe("schema validation", () => {
    it("rejects invalid transactions response", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: "not-an-array", total: "bad" })
      );

      await expect(adminService.getTransactions()).rejects.toThrow(
        /validation/i
      );
    });

    it("rejects invalid KPI response", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ active_services: "not-an-object" })
      );

      await expect(adminService.getKPIs()).rejects.toThrow(/validation/i);
    });

    it("rejects weekly performance with wrong number of days", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          days: [
            { label: "Mon", completed: 12, date: "2024-01-08" },
            { label: "Tue", completed: 15, date: "2024-01-09" },
          ],
        })
      );

      await expect(adminService.getWeeklyPerformance()).rejects.toThrow(
        /validation/i
      );
    });
  });
});
