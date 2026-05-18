/**
 * Unit tests for AI Diagnosis Service.
 * @module api/services/ai.service.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAIService } from "./ai.service";
import { ApiError } from "../client/errors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

function createValidDiagnosisResponse() {
  return {
    diagnosis: "Electrical wiring issue detected",
    confidence: 0.87,
    suggested_category: "electrical",
    tags: ["wiring", "outlet", "damage"],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createAIService", () => {
  const mockTokenProvider = vi.fn().mockResolvedValue("test-jwt-token");
  let service: ReturnType<typeof createAIService>;

  beforeEach(() => {
    service = createAIService({
      baseUrl: "http://localhost:3000",
      tokenProvider: mockTokenProvider,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("diagnoseImage - file validation", () => {
    it("should reject files exceeding 5MB", async () => {
      const largeFile = createMockFile("large.png", 5 * 1024 * 1024 + 1, "image/png");

      await expect(service.diagnoseImage(largeFile)).rejects.toThrow(ApiError);
      await expect(service.diagnoseImage(largeFile)).rejects.toMatchObject({
        statusCode: 422,
        code: "invalid_file",
      });
    });

    it("should reject non-PNG/JPG files", async () => {
      const gifFile = createMockFile("image.gif", 1024, "image/gif");

      await expect(service.diagnoseImage(gifFile)).rejects.toThrow(ApiError);
      await expect(service.diagnoseImage(gifFile)).rejects.toMatchObject({
        statusCode: 422,
        code: "invalid_file",
      });
    });

    it("should reject files with empty MIME type", async () => {
      const noTypeFile = createMockFile("file.bin", 1024, "");

      await expect(service.diagnoseImage(noTypeFile)).rejects.toThrow(ApiError);
      await expect(service.diagnoseImage(noTypeFile)).rejects.toMatchObject({
        statusCode: 422,
        code: "invalid_file",
      });
    });

    it("should accept PNG files within size limit", async () => {
      const validFile = createMockFile("photo.png", 1024, "image/png");
      const mockResponse = createValidDiagnosisResponse();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await service.diagnoseImage(validFile);
      expect(result).toEqual(mockResponse);
    });

    it("should accept JPEG files within size limit", async () => {
      const validFile = createMockFile("photo.jpg", 2 * 1024 * 1024, "image/jpeg");
      const mockResponse = createValidDiagnosisResponse();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await service.diagnoseImage(validFile);
      expect(result).toEqual(mockResponse);
    });

    it("should accept files exactly at 5MB limit", async () => {
      const exactFile = createMockFile("exact.png", 5 * 1024 * 1024, "image/png");
      const mockResponse = createValidDiagnosisResponse();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await service.diagnoseImage(exactFile);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("diagnoseImage - request handling", () => {
    it("should send multipart/form-data with field name 'image'", async () => {
      const validFile = createMockFile("photo.png", 1024, "image/png");
      const mockResponse = createValidDiagnosisResponse();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      vi.stubGlobal("fetch", fetchMock);

      await service.diagnoseImage(validFile);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:3000/api/ai/diagnose");
      expect(options.method).toBe("POST");
      expect(options.body).toBeInstanceOf(FormData);
      expect((options.body as FormData).get("image")).toBeInstanceOf(File);
    });

    it("should include Authorization header with JWT token", async () => {
      const validFile = createMockFile("photo.png", 1024, "image/png");
      const mockResponse = createValidDiagnosisResponse();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      vi.stubGlobal("fetch", fetchMock);

      await service.diagnoseImage(validFile);

      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers["Authorization"]).toBe("Bearer test-jwt-token");
    });

    it("should NOT set Content-Type header (let browser set multipart boundary)", async () => {
      const validFile = createMockFile("photo.png", 1024, "image/png");
      const mockResponse = createValidDiagnosisResponse();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      vi.stubGlobal("fetch", fetchMock);

      await service.diagnoseImage(validFile);

      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers["Content-Type"]).toBeUndefined();
    });
  });

  describe("diagnoseImage - error handling", () => {
    it("should throw timeout error when request exceeds timeout", async () => {
      const validFile = createMockFile("photo.png", 1024, "image/png");
      const abortError = new DOMException("The operation was aborted", "AbortError");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(abortError)
      );

      await expect(service.diagnoseImage(validFile)).rejects.toMatchObject({
        statusCode: 0,
        code: "timeout",
      });
    });

    it("should throw network_error on fetch failure", async () => {
      const validFile = createMockFile("photo.png", 1024, "image/png");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network failure"))
      );

      await expect(service.diagnoseImage(validFile)).rejects.toMatchObject({
        statusCode: 0,
        code: "network_error",
        message: "Network failure",
      });
    });

    it("should throw ApiError on non-ok response with error body", async () => {
      const validFile = createMockFile("photo.png", 1024, "image/png");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: () =>
            Promise.resolve({
              error: "internal_error",
              message: "AI service unavailable",
            }),
        })
      );

      await expect(service.diagnoseImage(validFile)).rejects.toMatchObject({
        statusCode: 500,
        code: "internal_error",
        message: "AI service unavailable",
      });
    });

    it("should throw response_validation_error when response does not match schema", async () => {
      const validFile = createMockFile("photo.png", 1024, "image/png");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              diagnosis: "",  // empty string fails min(1)
              confidence: 2.0, // exceeds max(1)
              suggested_category: "invalid_category",
              tags: "not_an_array",
            }),
        })
      );

      await expect(service.diagnoseImage(validFile)).rejects.toMatchObject({
        code: "response_validation_error",
      });
    });
  });
});
