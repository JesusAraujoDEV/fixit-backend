/**
 * Unit tests for the requests service.
 * @module api/services/requests.service.test
 */

import { describe, it, expect, vi } from "vitest";
import { createRequestsService } from "./requests.service";
import { ValidationError } from "../client/errors";
import type { HttpClient } from "../client/http-client";
import type { CreateRequestBody, CreateRequestResponse, ClientRequest } from "../types/requests";

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

const validBody: CreateRequestBody = {
  title: "Fix my leaking faucet",
  category: "plumbing",
  description: "The kitchen faucet has been dripping for two days.",
  location: { lat: 19.4326, lng: -99.1332, address: "Av. Reforma 123" },
  images: ["https://example.com/photo1.jpg"],
};

const mockCreateResponse: CreateRequestResponse = {
  id: "req-001",
  title: "Fix my leaking faucet",
  category: "plumbing",
  description: "The kitchen faucet has been dripping for two days.",
  location: { lat: 19.4326, lng: -99.1332, address: "Av. Reforma 123" },
  images: ["https://example.com/photo1.jpg"],
  status: "pending",
  created_at: "2024-01-15T10:30:00.000Z",
  nearby_technicians_count: 3,
  estimated_response_min: 5,
};

const mockClientRequests: ClientRequest[] = [
  {
    id: "req-001",
    title: "Fix my leaking faucet",
    category: "plumbing",
    status: "active",
    technician: { name: "Carlos M." },
    created_at: "2024-01-15T10:30:00.000Z",
    price: null,
    eta_minutes: 12,
  },
  {
    id: "req-002",
    title: "Install ceiling fan",
    category: "electrical",
    status: "completed",
    technician: { name: "Ana R." },
    created_at: "2024-01-10T08:00:00.000Z",
    price: "$150.00",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createRequestsService", () => {
  describe("createRequest", () => {
    it("sends POST to /api/requests with validated body and schema", async () => {
      const mockPost = vi.fn().mockResolvedValue(mockCreateResponse);
      const client = createMockClient({ post: mockPost });
      const service = createRequestsService(client);

      const result = await service.createRequest(validBody);

      expect(mockPost).toHaveBeenCalledWith(
        "/api/requests",
        validBody,
        expect.objectContaining({ schema: expect.anything() })
      );
      expect(result).toEqual(mockCreateResponse);
    });

    it("throws ValidationError when title is too short", async () => {
      const client = createMockClient();
      const service = createRequestsService(client);

      const invalidBody = { ...validBody, title: "Hi" };

      await expect(service.createRequest(invalidBody)).rejects.toThrow(ValidationError);
      expect(client.post).not.toHaveBeenCalled();
    });

    it("throws ValidationError when title is too long", async () => {
      const client = createMockClient();
      const service = createRequestsService(client);

      const invalidBody = { ...validBody, title: "A".repeat(201) };

      await expect(service.createRequest(invalidBody)).rejects.toThrow(ValidationError);
      expect(client.post).not.toHaveBeenCalled();
    });

    it("throws ValidationError when category is invalid", async () => {
      const client = createMockClient();
      const service = createRequestsService(client);

      const invalidBody = { ...validBody, category: "invalid" as any };

      await expect(service.createRequest(invalidBody)).rejects.toThrow(ValidationError);
      expect(client.post).not.toHaveBeenCalled();
    });

    it("throws ValidationError when description exceeds 2000 chars", async () => {
      const client = createMockClient();
      const service = createRequestsService(client);

      const invalidBody = { ...validBody, description: "X".repeat(2001) };

      await expect(service.createRequest(invalidBody)).rejects.toThrow(ValidationError);
      expect(client.post).not.toHaveBeenCalled();
    });

    it("throws ValidationError when images exceed 4 items", async () => {
      const client = createMockClient();
      const service = createRequestsService(client);

      const invalidBody = {
        ...validBody,
        images: [
          "https://a.com/1.jpg",
          "https://a.com/2.jpg",
          "https://a.com/3.jpg",
          "https://a.com/4.jpg",
          "https://a.com/5.jpg",
        ],
      };

      await expect(service.createRequest(invalidBody)).rejects.toThrow(ValidationError);
      expect(client.post).not.toHaveBeenCalled();
    });

    it("includes field-level errors in ValidationError", async () => {
      const client = createMockClient();
      const service = createRequestsService(client);

      const invalidBody = { ...validBody, title: "Hi" };

      try {
        await service.createRequest(invalidBody);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationErr = err as ValidationError;
        expect(validationErr.errors.length).toBeGreaterThan(0);
        expect(validationErr.errors[0]).toHaveProperty("field");
        expect(validationErr.errors[0]).toHaveProperty("message");
      }
    });

    it("accepts valid body with empty description and no images", async () => {
      const mockPost = vi.fn().mockResolvedValue(mockCreateResponse);
      const client = createMockClient({ post: mockPost });
      const service = createRequestsService(client);

      const minimalBody: CreateRequestBody = {
        title: "Short title here",
        category: "general",
        description: "",
        location: { lat: 20.0, lng: -100.0, address: "Some address" },
        images: [],
      };

      await service.createRequest(minimalBody);
      expect(mockPost).toHaveBeenCalled();
    });
  });

  describe("getMyRequests", () => {
    it("sends GET to /api/requests/mine without status filter", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockClientRequests);
      const client = createMockClient({ get: mockGet });
      const service = createRequestsService(client);

      const result = await service.getMyRequests();

      expect(mockGet).toHaveBeenCalledWith(
        "/api/requests/mine",
        expect.objectContaining({
          params: {},
          schema: expect.anything(),
        })
      );
      expect(result).toEqual(mockClientRequests);
    });

    it("sends GET with status filter when provided", async () => {
      const mockGet = vi.fn().mockResolvedValue([mockClientRequests[0]]);
      const client = createMockClient({ get: mockGet });
      const service = createRequestsService(client);

      await service.getMyRequests("active");

      expect(mockGet).toHaveBeenCalledWith(
        "/api/requests/mine",
        expect.objectContaining({
          params: { status: "active" },
        })
      );
    });

    it("passes completed status filter", async () => {
      const mockGet = vi.fn().mockResolvedValue([mockClientRequests[1]]);
      const client = createMockClient({ get: mockGet });
      const service = createRequestsService(client);

      await service.getMyRequests("completed");

      expect(mockGet).toHaveBeenCalledWith(
        "/api/requests/mine",
        expect.objectContaining({
          params: { status: "completed" },
        })
      );
    });

    it("passes cancelled status filter", async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      const client = createMockClient({ get: mockGet });
      const service = createRequestsService(client);

      await service.getMyRequests("cancelled");

      expect(mockGet).toHaveBeenCalledWith(
        "/api/requests/mine",
        expect.objectContaining({
          params: { status: "cancelled" },
        })
      );
    });

    it("validates response with z.array(clientRequestSchema)", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockClientRequests);
      const client = createMockClient({ get: mockGet });
      const service = createRequestsService(client);

      await service.getMyRequests();

      const callArgs = mockGet.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("schema");
    });
  });
});
