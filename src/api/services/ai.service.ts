/**
 * AI Diagnosis Service API client functions.
 *
 * Provides a typed function for uploading an image for AI-powered diagnosis.
 * Uses multipart/form-data upload with client-side file validation
 * (size and format) before sending to the server.
 *
 * @module api/services/ai
 */

import { AI_ENDPOINTS, AI_UPLOAD_TIMEOUT_MS, API_BASE_URL } from "../client/config";
import { ApiError } from "../client/errors";
import { diagnosisResponseSchema } from "../schemas/ai.schema";
import type { DiagnosisResponse } from "../types/ai";
import type { TokenProvider } from "../client/http-client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum allowed file size in bytes (5 MB). */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Allowed MIME types for image uploads. */
const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
]);

// ---------------------------------------------------------------------------
// File Validation
// ---------------------------------------------------------------------------

/**
 * Validates the uploaded file against size and format constraints.
 * Throws ApiError(422, "invalid_file") if validation fails.
 *
 * @param file - The file to validate.
 * @throws {ApiError} 422 if file exceeds 5MB or is not PNG/JPG.
 */
function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ApiError(
      422,
      "invalid_file",
      `File size ${file.size} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes (5MB)`
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new ApiError(
      422,
      "invalid_file",
      `File type "${file.type}" is not supported. Only PNG and JPG images are allowed`
    );
  }
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * Configuration for the AI service.
 */
export interface AIServiceConfig {
  /** Base URL for API requests. Defaults to API_BASE_URL. */
  baseUrl?: string;
  /** Token provider for JWT authentication. */
  tokenProvider: TokenProvider;
}

/**
 * Creates AI service API functions bound to the given configuration.
 *
 * @param config - Configuration with token provider for authenticated requests.
 * @returns Object with AI diagnosis functions.
 *
 * @example
 * ```ts
 * const aiService = createAIService({
 *   tokenProvider: () => localStorage.getItem("token"),
 * });
 *
 * const result = await aiService.diagnoseImage(imageFile);
 * console.log(result.diagnosis, result.confidence);
 * ```
 */
export function createAIService(config: AIServiceConfig) {
  const { baseUrl = API_BASE_URL, tokenProvider } = config;

  /**
   * Uploads an image for AI-powered diagnosis.
   *
   * Validates the file locally (size ≤ 5MB, PNG/JPG format) before uploading.
   * Sends the file as multipart/form-data with field name "image".
   * Validates the response against the diagnosis Zod schema.
   *
   * @param file - The image file to diagnose.
   * @returns The AI diagnosis result with confidence, category, and tags.
   * @throws {ApiError} 422 if file is too large or wrong format.
   * @throws {ApiError} 0 "timeout" if request exceeds AI_UPLOAD_TIMEOUT_MS.
   * @throws {ApiError} 0 "network_error" if fetch fails.
   */
  async function diagnoseImage(file: File): Promise<DiagnosisResponse> {
    // Validate file before uploading
    validateFile(file);

    // Build multipart form data
    const formData = new FormData();
    formData.append("image", file);

    // Resolve authorization token
    const token = await tokenProvider();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // Do NOT set Content-Type — let the browser set the multipart boundary

    // Set up timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_UPLOAD_TIMEOUT_MS);

    let response: Response;

    try {
      const url = new URL(AI_ENDPOINTS.DIAGNOSE, baseUrl).toString();

      response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal,
      });
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError(
          0,
          "timeout",
          `Request timed out after ${AI_UPLOAD_TIMEOUT_MS}ms`
        );
      }
      throw new ApiError(
        0,
        "network_error",
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle error responses
    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new ApiError(
          response.status,
          "unknown",
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const errorCode =
        body && typeof body === "object" && "error" in body && typeof (body as Record<string, unknown>).error === "string"
          ? (body as { error: string }).error
          : "unknown";
      const errorMessage =
        body && typeof body === "object" && "message" in body && typeof (body as Record<string, unknown>).message === "string"
          ? (body as { message: string }).message
          : `HTTP ${response.status}: ${response.statusText}`;

      throw new ApiError(response.status, errorCode, errorMessage);
    }

    // Parse response body
    const data = await response.json();

    // Validate against Zod schema
    const result = diagnosisResponseSchema.safeParse(data);
    if (!result.success) {
      throw new ApiError(
        response.status,
        "response_validation_error",
        `Response validation failed: ${result.error.message}`
      );
    }

    return result.data;
  }

  return {
    diagnoseImage,
  };
}
