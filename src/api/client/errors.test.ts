/**
 * Unit tests for custom API error classes.
 */

import { describe, it, expect } from "vitest";
import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "./errors";

describe("ApiError", () => {
  it("stores statusCode, code, and message", () => {
    const err = new ApiError(500, "internal_error", "Something went wrong");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("internal_error");
    expect(err.message).toBe("Something went wrong");
    expect(err.name).toBe("ApiError");
  });

  it("is an instance of Error", () => {
    const err = new ApiError(400, "invalid_params", "Bad request");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe("AuthenticationError", () => {
  it("maps to status 401 with unauthorized code", () => {
    const err = new AuthenticationError("unauthorized", "No token provided");
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("unauthorized");
    expect(err.name).toBe("AuthenticationError");
    expect(err).toBeInstanceOf(ApiError);
  });

  it("supports token_expired code", () => {
    const err = new AuthenticationError("token_expired", "Token has expired");
    expect(err.code).toBe("token_expired");
  });

  it("supports token_invalid code", () => {
    const err = new AuthenticationError("token_invalid", "Malformed token");
    expect(err.code).toBe("token_invalid");
  });
});

describe("AuthorizationError", () => {
  it("maps to status 403 with forbidden code", () => {
    const err = new AuthorizationError("Insufficient permissions");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("forbidden");
    expect(err.name).toBe("AuthorizationError");
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe("ValidationError", () => {
  it("maps to status 422 with field errors", () => {
    const errors = [
      { field: "title", message: "Title is required" },
      { field: "category", message: "Invalid category" },
    ];
    const err = new ValidationError(errors);
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("validation_error");
    expect(err.errors).toEqual(errors);
    expect(err.name).toBe("ValidationError");
    expect(err).toBeInstanceOf(ApiError);
  });

  it("uses custom message when provided", () => {
    const err = new ValidationError([{ field: "email", message: "Invalid" }], "Custom message");
    expect(err.message).toBe("Custom message");
  });

  it("uses default message when not provided", () => {
    const err = new ValidationError([{ field: "email", message: "Invalid" }]);
    expect(err.message).toBe("Validation failed");
  });
});

describe("NotFoundError", () => {
  it("maps to status 404 with not_found code", () => {
    const err = new NotFoundError("Resource not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("not_found");
    expect(err.name).toBe("NotFoundError");
    expect(err).toBeInstanceOf(ApiError);
  });
});
