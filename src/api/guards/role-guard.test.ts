/**
 * Unit tests for the RBAC role guard utilities.
 *
 * @module api/guards/role-guard.test
 */

import { describe, it, expect } from "vitest";
import {
  requireRole,
  resolveEndpointRoles,
  decodeTokenPayload,
  createRoleGuard,
  ROLE_ENDPOINT_MAP,
  ENDPOINT_ROLE_PATTERNS,
} from "./role-guard";
import { AuthenticationError, AuthorizationError } from "../client/errors";
import type { UserRole } from "../types/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a fake JWT token with the given payload. */
function createFakeJWT(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa("fake-signature");
  return `${header}.${body}.${signature}`;
}

function validPayload(role: UserRole = "client") {
  return {
    sub: "user-123",
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

// ---------------------------------------------------------------------------
// ROLE_ENDPOINT_MAP
// ---------------------------------------------------------------------------

describe("ROLE_ENDPOINT_MAP", () => {
  it("maps client endpoints to client role only", () => {
    expect(ROLE_ENDPOINT_MAP.client).toEqual(["client"]);
  });

  it("maps technician endpoints to technician role only", () => {
    expect(ROLE_ENDPOINT_MAP.technician).toEqual(["technician"]);
  });

  it("maps admin endpoints to admin role only", () => {
    expect(ROLE_ENDPOINT_MAP.admin).toEqual(["admin"]);
  });

  it("maps shared endpoints to all roles", () => {
    expect(ROLE_ENDPOINT_MAP.shared).toEqual([
      "client",
      "technician",
      "admin",
    ]);
  });

  it("maps map-technicians to client and admin", () => {
    expect(ROLE_ENDPOINT_MAP["map-technicians"]).toEqual(["client", "admin"]);
  });
});

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------

describe("requireRole", () => {
  it("does not throw when role is in allowed list", () => {
    expect(() => requireRole("client", ["client", "admin"])).not.toThrow();
    expect(() => requireRole("admin", ["admin"])).not.toThrow();
    expect(() =>
      requireRole("technician", ["client", "technician", "admin"])
    ).not.toThrow();
  });

  it("throws AuthorizationError when role is not in allowed list", () => {
    expect(() => requireRole("client", ["admin"])).toThrow(AuthorizationError);
    expect(() => requireRole("technician", ["client"])).toThrow(
      AuthorizationError
    );
    expect(() => requireRole("admin", ["client", "technician"])).toThrow(
      AuthorizationError
    );
  });

  it("throws AuthenticationError when role is null or undefined", () => {
    expect(() => requireRole(null, ["client"])).toThrow(AuthenticationError);
    expect(() => requireRole(undefined, ["admin"])).toThrow(
      AuthenticationError
    );
  });

  it("includes role and required roles in error message", () => {
    try {
      requireRole("client", ["admin"]);
    } catch (error) {
      expect(error).toBeInstanceOf(AuthorizationError);
      expect((error as AuthorizationError).message).toContain("client");
      expect((error as AuthorizationError).message).toContain("admin");
    }
  });
});

// ---------------------------------------------------------------------------
// resolveEndpointRoles
// ---------------------------------------------------------------------------

describe("resolveEndpointRoles", () => {
  it("resolves /api/auth/me to shared (all roles)", () => {
    expect(resolveEndpointRoles("/api/auth/me")).toEqual([
      "client",
      "technician",
      "admin",
    ]);
  });

  it("resolves /api/requests to client", () => {
    expect(resolveEndpointRoles("/api/requests")).toEqual(["client"]);
  });

  it("resolves /api/requests/mine to client", () => {
    expect(resolveEndpointRoles("/api/requests/mine")).toEqual(["client"]);
  });

  it("resolves /api/map/requests to client", () => {
    expect(resolveEndpointRoles("/api/map/requests")).toEqual(["client"]);
  });

  it("resolves /api/jobs/available to technician", () => {
    expect(resolveEndpointRoles("/api/jobs/available")).toEqual(["technician"]);
  });

  it("resolves /api/jobs/completed to technician", () => {
    expect(resolveEndpointRoles("/api/jobs/completed")).toEqual(["technician"]);
  });

  it("resolves /api/technician/availability to technician", () => {
    expect(resolveEndpointRoles("/api/technician/availability")).toEqual([
      "technician",
    ]);
  });

  it("resolves /api/map/heatmap to technician", () => {
    expect(resolveEndpointRoles("/api/map/heatmap")).toEqual(["technician"]);
  });

  it("resolves /api/map/technicians to client and admin", () => {
    expect(resolveEndpointRoles("/api/map/technicians")).toEqual([
      "client",
      "admin",
    ]);
  });

  it("resolves /api/admin/transactions to admin", () => {
    expect(resolveEndpointRoles("/api/admin/transactions")).toEqual(["admin"]);
  });

  it("resolves /api/admin/verifications to admin", () => {
    expect(resolveEndpointRoles("/api/admin/verifications")).toEqual(["admin"]);
  });

  it("resolves /api/admin/kpis to admin", () => {
    expect(resolveEndpointRoles("/api/admin/kpis")).toEqual(["admin"]);
  });

  it("returns null for unknown endpoints", () => {
    expect(resolveEndpointRoles("/api/unknown")).toBeNull();
    expect(resolveEndpointRoles("/other/path")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decodeTokenPayload
// ---------------------------------------------------------------------------

describe("decodeTokenPayload", () => {
  it("decodes a valid JWT token", () => {
    const payload = validPayload("admin");
    const token = createFakeJWT(payload);
    const decoded = decodeTokenPayload(token);

    expect(decoded.sub).toBe("user-123");
    expect(decoded.role).toBe("admin");
    expect(decoded.iat).toBe(payload.iat);
    expect(decoded.exp).toBe(payload.exp);
  });

  it("throws AuthenticationError for token with less than 3 parts", () => {
    expect(() => decodeTokenPayload("only.two")).toThrow(AuthenticationError);
    expect(() => decodeTokenPayload("only.two")).toThrow("Malformed JWT");
  });

  it("throws AuthenticationError for token with invalid base64", () => {
    expect(() => decodeTokenPayload("a.!!!invalid.c")).toThrow(
      AuthenticationError
    );
  });

  it("throws AuthenticationError for token missing required claims", () => {
    const token = createFakeJWT({ sub: "user-1" }); // missing role, iat, exp
    expect(() => decodeTokenPayload(token)).toThrow(AuthenticationError);
    expect(() => decodeTokenPayload(token)).toThrow("missing required claims");
  });

  it("throws AuthenticationError for invalid role claim", () => {
    const token = createFakeJWT({
      sub: "user-1",
      role: "superadmin",
      iat: 1000,
      exp: 2000,
    });
    expect(() => decodeTokenPayload(token)).toThrow(AuthenticationError);
    expect(() => decodeTokenPayload(token)).toThrow("Invalid role claim");
  });

  it("accepts all valid roles", () => {
    const roles: UserRole[] = ["client", "technician", "admin"];
    for (const role of roles) {
      const token = createFakeJWT(validPayload(role));
      const decoded = decodeTokenPayload(token);
      expect(decoded.role).toBe(role);
    }
  });
});

// ---------------------------------------------------------------------------
// createRoleGuard
// ---------------------------------------------------------------------------

describe("createRoleGuard", () => {
  describe("checkRole", () => {
    it("resolves when role matches", async () => {
      const token = createFakeJWT(validPayload("admin"));
      const guard = createRoleGuard(() => token);

      await expect(guard.checkRole(["admin"])).resolves.toBeUndefined();
    });

    it("resolves when role is in multi-role list", async () => {
      const token = createFakeJWT(validPayload("client"));
      const guard = createRoleGuard(() => token);

      await expect(
        guard.checkRole(["client", "admin"])
      ).resolves.toBeUndefined();
    });

    it("throws AuthorizationError when role does not match", async () => {
      const token = createFakeJWT(validPayload("client"));
      const guard = createRoleGuard(() => token);

      await expect(guard.checkRole(["admin"])).rejects.toThrow(
        AuthorizationError
      );
    });

    it("throws AuthenticationError when no token is provided", async () => {
      const guard = createRoleGuard(() => null);

      await expect(guard.checkRole(["admin"])).rejects.toThrow(
        AuthenticationError
      );
    });

    it("works with async token provider", async () => {
      const token = createFakeJWT(validPayload("technician"));
      const guard = createRoleGuard(async () => token);

      await expect(
        guard.checkRole(["technician"])
      ).resolves.toBeUndefined();
    });
  });

  describe("requireEndpointAccess", () => {
    it("allows client to access /api/requests", async () => {
      const token = createFakeJWT(validPayload("client"));
      const guard = createRoleGuard(() => token);

      await expect(
        guard.requireEndpointAccess("/api/requests")
      ).resolves.toBeUndefined();
    });

    it("denies technician access to /api/admin/transactions", async () => {
      const token = createFakeJWT(validPayload("technician"));
      const guard = createRoleGuard(() => token);

      await expect(
        guard.requireEndpointAccess("/api/admin/transactions")
      ).rejects.toThrow(AuthorizationError);
    });

    it("denies client access to /api/technician/availability", async () => {
      const token = createFakeJWT(validPayload("client"));
      const guard = createRoleGuard(() => token);

      await expect(
        guard.requireEndpointAccess("/api/technician/availability")
      ).rejects.toThrow(AuthorizationError);
    });

    it("allows all roles to access /api/auth/me", async () => {
      const roles: UserRole[] = ["client", "technician", "admin"];

      for (const role of roles) {
        const token = createFakeJWT(validPayload(role));
        const guard = createRoleGuard(() => token);

        await expect(
          guard.requireEndpointAccess("/api/auth/me")
        ).resolves.toBeUndefined();
      }
    });

    it("allows client and admin to access /api/map/technicians", async () => {
      for (const role of ["client", "admin"] as UserRole[]) {
        const token = createFakeJWT(validPayload(role));
        const guard = createRoleGuard(() => token);

        await expect(
          guard.requireEndpointAccess("/api/map/technicians")
        ).resolves.toBeUndefined();
      }
    });

    it("denies technician access to /api/map/technicians", async () => {
      const token = createFakeJWT(validPayload("technician"));
      const guard = createRoleGuard(() => token);

      await expect(
        guard.requireEndpointAccess("/api/map/technicians")
      ).rejects.toThrow(AuthorizationError);
    });

    it("requires authentication for unknown endpoints", async () => {
      const guard = createRoleGuard(() => null);

      await expect(
        guard.requireEndpointAccess("/api/unknown")
      ).rejects.toThrow(AuthenticationError);
    });

    it("allows authenticated users to access unknown endpoints", async () => {
      const token = createFakeJWT(validPayload("client"));
      const guard = createRoleGuard(() => token);

      await expect(
        guard.requireEndpointAccess("/api/unknown")
      ).resolves.toBeUndefined();
    });
  });

  describe("getDecodedToken", () => {
    it("returns decoded token payload", async () => {
      const payload = validPayload("admin");
      const token = createFakeJWT(payload);
      const guard = createRoleGuard(() => token);

      const decoded = await guard.getDecodedToken();
      expect(decoded.sub).toBe("user-123");
      expect(decoded.role).toBe("admin");
    });

    it("throws AuthenticationError when no token", async () => {
      const guard = createRoleGuard(() => null);

      await expect(guard.getDecodedToken()).rejects.toThrow(
        AuthenticationError
      );
    });
  });
});
